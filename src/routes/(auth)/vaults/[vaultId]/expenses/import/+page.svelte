<script lang="ts">
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { toast } from 'svelte-sonner';
    import { Button } from '$lib/components/ui/button';
    import { Toaster } from '$lib/components/ui/sonner';
    import Upload from '@lucide/svelte/icons/upload';
    import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
    import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
    import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import Sparkles from '@lucide/svelte/icons/sparkles';
    import type {
        NormalizedImportRow,
        ImportRowError,
        PreviewImportResponse,
        ConfirmImportResponse,
    } from '$lib/schemas/csv';

    let { data } = $props();
    const { vaultId, canImport } = data;

    type Stage = 'pick' | 'previewing' | 'review' | 'importing' | 'done';

    let stage = $state<Stage>('pick');
    let fileName = $state('');
    let preview = $state<PreviewImportResponse | null>(null);
    let skipInvalid = $state(false);
    let importResult = $state<ConfirmImportResponse | null>(null);
    let errorMessage = $state('');

    async function onFilePicked(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        fileName = file.name;
        stage = 'previewing';
        errorMessage = '';

        const form = new FormData();
        form.append('vaultId', vaultId);
        form.append('file', file);

        try {
            const res = await ofetch<{ success: boolean; data?: PreviewImportResponse; error?: string }>(
                '/api/previewImportExpenses',
                { method: 'POST', body: form },
            );
            if (!res.success || !res.data) {
                throw new Error(res.error || 'Preview failed');
            }
            preview = res.data;
            stage = 'review';
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to read CSV';
            errorMessage = msg;
            stage = 'pick';
            toast.error(msg);
            // Reset the file input so the same file can be re-picked.
            target.value = '';
        }
    }

    async function onConfirm() {
        if (!preview) return;
        stage = 'importing';
        errorMessage = '';

        const rows: NormalizedImportRow[] = skipInvalid
            ? preview.validRows
            : preview.errors.length === 0
                ? preview.validRows
                : [];

        if (rows.length === 0) {
            errorMessage = 'No valid rows to import';
            stage = 'review';
            return;
        }

        try {
            const res = await ofetch<{ success: boolean; data?: ConfirmImportResponse; error?: string }>(
                '/api/confirmImportExpenses',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vaultId,
                        importToken: preview.importToken,
                        skipInvalid,
                        rows,
                    }),
                },
            );
            if (!res.success || !res.data) {
                throw new Error(res.error || 'Import failed');
            }
            importResult = res.data;
            stage = 'done';
            if (res.data.success) {
                toast.success(`Imported ${res.data.importedCount} expenses`);
            } else {
                toast.error(`Imported ${res.data.importedCount} before failing at row ${res.data.failedAtRow}`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to import expenses';
            errorMessage = msg;
            stage = 'review';
            toast.error(msg);
        }
    }

    async function onUndo() {
        if (!importResult) return;
        try {
            const res = await ofetch<{ success: boolean; data?: { undoneCount: number }; error?: string }>(
                '/api/undoImportExpenses',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ vaultId, importBatchId: importResult.importBatchId }),
                },
            );
            if (!res.success) throw new Error(res.error || 'Undo failed');
            toast.success(`Removed ${res.data?.undoneCount ?? 0} imported expenses`);
            goto(`/vaults/${vaultId}/expenses`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to undo import');
        }
    }

    function downloadErrorReport() {
        if (!preview) return;
        const headers = ['lineNumber', 'field', 'value', 'error'];
        const lines = [headers.join(',')];
        for (const e of preview.errors) {
            const row = [e.lineNumber, e.field, e.value, e.error]
                .map((v) => {
                    const s = String(v);
                    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                })
                .join(',');
            lines.push(row);
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import-errors-${fileName.replace(/\.csv$/i, '')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function reset() {
        stage = 'pick';
        preview = null;
        fileName = '';
        skipInvalid = false;
        importResult = null;
        errorMessage = '';
    }
</script>

<svelte:head>
    <title>Import Expenses - DuitGee</title>
</svelte:head>

<Toaster />

<div class="container mx-auto py-4 md:py-8 px-4 max-w-3xl space-y-6">
    <div class="flex items-center gap-2">
        <Button
            variant="ghost"
            size="sm"
            onclick={() => goto(`/vaults/${vaultId}/expenses`)}
        >
            <ArrowLeft class="size-4" />
            Back to expenses
        </Button>
    </div>

    <div>
        <h1 class="text-2xl md:text-3xl font-bold">Import expenses from CSV</h1>
        <p class="text-sm text-muted-foreground mt-1">
            Bulk-import expenses from a spreadsheet — useful for migrating from another app.
        </p>
    </div>

    {#if !canImport}
        <!-- Pro upsell — page is reachable on free, but the action is gated. -->
        <div class="border rounded-[var(--radius-md)] bg-card p-6 space-y-4">
            <div class="flex items-start gap-3">
                <Sparkles class="size-5 text-primary shrink-0 mt-0.5" />
                <div>
                    <h2 class="font-semibold">CSV import is a Pro feature</h2>
                    <p class="text-sm text-muted-foreground mt-1">
                        Upgrade this vault to Pro to bulk-import expenses from a spreadsheet.
                        Export is included on every plan — your data is always portable.
                    </p>
                </div>
            </div>
            <Button onclick={() => goto('/settings/plan')} size="sm">
                View plans
            </Button>
        </div>
    {:else if stage === 'pick'}
        <div class="border rounded-[var(--radius-md)] bg-card p-6 space-y-4">
            <div class="flex items-start gap-3">
                <FileSpreadsheet class="size-5 text-muted-foreground shrink-0 mt-0.5" />
                <div class="text-sm space-y-2">
                    <p class="font-medium">Expected columns</p>
                    <p class="text-muted-foreground">
                        <code class="font-mono text-xs">date</code>,
                        <code class="font-mono text-xs">amount</code>,
                        <code class="font-mono text-xs">category</code>,
                        <code class="font-mono text-xs">paymentType</code>,
                        <code class="font-mono text-xs">note</code>,
                        <code class="font-mono text-xs">paidByEmail</code>,
                        <code class="font-mono text-xs">tags</code>
                        <span class="text-muted-foreground/70">(semicolon-joined)</span>
                    </p>
                    <p class="text-muted-foreground">
                        Tip: export an existing vault first to see the exact format.
                    </p>
                </div>
            </div>

            <label class="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed rounded-md cursor-pointer hover:bg-accent">
                <Upload class="size-6 text-muted-foreground" />
                <span class="text-sm font-medium">Click to choose a CSV file</span>
                <span class="text-xs text-muted-foreground">Max 10,000 rows</span>
                <input
                    type="file"
                    accept=".csv,text/csv"
                    class="hidden"
                    onchange={onFilePicked}
                />
            </label>

            {#if errorMessage}
                <p class="text-sm text-destructive">{errorMessage}</p>
            {/if}
        </div>
    {:else if stage === 'previewing'}
        <div class="border rounded-[var(--radius-md)] bg-card p-12 flex flex-col items-center gap-3">
            <div class="animate-spin rounded-full size-8 border-b-2 border-primary"></div>
            <p class="text-sm text-muted-foreground">Reading {fileName}…</p>
        </div>
    {:else if stage === 'review' && preview}
        <div class="border rounded-[var(--radius-md)] bg-card p-6 space-y-4">
            <div class="flex flex-wrap items-center gap-4 text-sm">
                <span class="font-mono">{fileName}</span>
                <span class="text-muted-foreground">·</span>
                <span><strong class="font-mono">{preview.validRows.length}</strong> rows ready</span>
                {#if preview.errors.length > 0}
                    <span class="text-muted-foreground">·</span>
                    <span class="text-destructive">
                        <strong class="font-mono">{preview.errors.length}</strong> errors
                    </span>
                {/if}
                {#if preview.newTagNames.length > 0}
                    <span class="text-muted-foreground">·</span>
                    <span><strong class="font-mono">{preview.newTagNames.length}</strong> new tags will be created</span>
                {/if}
            </div>

            {#if preview.newTagNames.length > 0}
                <div class="flex flex-wrap gap-1.5">
                    {#each preview.newTagNames as tag (tag)}
                        <span class="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs">
                            {tag}
                        </span>
                    {/each}
                </div>
            {/if}

            {#if preview.errors.length > 0}
                <div class="border rounded-md bg-destructive/5 p-3 space-y-2">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 text-sm font-medium text-destructive">
                            <AlertTriangle class="size-4" />
                            Errors found
                        </div>
                        <Button variant="ghost" size="sm" onclick={downloadErrorReport}>
                            Download error report
                        </Button>
                    </div>
                    <div class="max-h-60 overflow-auto">
                        <table class="w-full text-xs">
                            <thead class="text-left text-muted-foreground">
                                <tr>
                                    <th class="py-1 pr-3">Line</th>
                                    <th class="py-1 pr-3">Field</th>
                                    <th class="py-1 pr-3">Value</th>
                                    <th class="py-1">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each preview.errors.slice(0, 100) as e (e.lineNumber + e.field)}
                                    <tr class="border-t border-destructive/20">
                                        <td class="py-1 pr-3 font-mono">{e.lineNumber}</td>
                                        <td class="py-1 pr-3 font-mono">{e.field}</td>
                                        <td class="py-1 pr-3 font-mono truncate max-w-[8rem]">{e.value || '—'}</td>
                                        <td class="py-1">{e.error}</td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                        {#if preview.errors.length > 100}
                            <p class="text-xs text-muted-foreground pt-2">
                                Showing first 100 of {preview.errors.length}. Download the report for the full list.
                            </p>
                        {/if}
                    </div>

                    <label class="flex items-center gap-2 text-xs pt-1">
                        <input type="checkbox" bind:checked={skipInvalid} />
                        Skip invalid rows and import the rest
                    </label>
                </div>
            {/if}

            <div class="flex items-center gap-2 pt-2">
                <Button variant="outline" onclick={reset}>Cancel</Button>
                <Button
                    onclick={onConfirm}
                    disabled={preview.errors.length > 0 && !skipInvalid}
                >
                    Import {preview.validRows.length} row{preview.validRows.length === 1 ? '' : 's'}
                </Button>
            </div>
        </div>
    {:else if stage === 'importing'}
        <div class="border rounded-[var(--radius-md)] bg-card p-12 flex flex-col items-center gap-3">
            <div class="animate-spin rounded-full size-8 border-b-2 border-primary"></div>
            <p class="text-sm text-muted-foreground">
                Importing {preview?.validRows.length ?? 0} expenses…
            </p>
            <p class="text-xs text-muted-foreground">This can take up to 30 seconds.</p>
        </div>
    {:else if stage === 'done' && importResult}
        <div class="border rounded-[var(--radius-md)] bg-card p-6 space-y-4">
            {#if importResult.success}
                <div class="flex items-start gap-3">
                    <CheckCircle2 class="size-5 text-primary shrink-0 mt-0.5" />
                    <div>
                        <h2 class="font-semibold">Imported {importResult.importedCount} expenses</h2>
                        <p class="text-sm text-muted-foreground mt-1">
                            Tagged with batch <code class="font-mono text-xs">{importResult.importBatchId}</code>.
                            Use Undo if anything looks off.
                        </p>
                    </div>
                </div>
            {:else}
                <div class="flex items-start gap-3">
                    <AlertTriangle class="size-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                        <h2 class="font-semibold">Partial import</h2>
                        <p class="text-sm text-muted-foreground mt-1">
                            Imported {importResult.importedCount} rows before failing at line {importResult.failedAtRow}.
                            Use Undo to remove what was imported, then fix the file and try again.
                        </p>
                        {#if importResult.error}
                            <p class="text-xs font-mono text-destructive mt-2">{importResult.error}</p>
                        {/if}
                    </div>
                </div>
            {/if}

            <div class="flex items-center gap-2 pt-2">
                <Button variant="outline" onclick={onUndo}>
                    Undo import
                </Button>
                <Button onclick={() => goto(`/vaults/${vaultId}/expenses`)}>
                    Go to expenses
                </Button>
            </div>
        </div>
    {/if}
</div>
