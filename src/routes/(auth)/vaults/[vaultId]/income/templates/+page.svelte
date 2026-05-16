<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { EmptyState } from '$lib/components/ui/empty-state';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { Toaster } from '$lib/components/ui/sonner';
    import { CalculatorInput } from '$lib/components/ui/calculator-input';
    import * as Select from '$lib/components/ui/select';
    import { IconCombobox } from '$lib/components/ui/icon-combobox';
    import { iconData } from '$lib/configurations/icons';
    import { toast } from 'svelte-sonner';
    import Plus from '@lucide/svelte/icons/plus';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import FileText from '@lucide/svelte/icons/file-text';
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';

    let { data } = $props();
    const vaultId = $derived(page.params.vaultId);

    type Source = { id: string; name: string; icon: string | null };
    type Template = {
        id: string;
        sourceId: string;
        name: string;
        icon: string | null;
        defaultAmount: number | null;
        defaultPaidTo: string | null;
        defaultFundId: string | null;
        defaultNote: string | null;
        usageCount: number;
        lastUsedAt: string | null;
        source: { name: string | null; icon: string | null };
    };

    let refetchKey = $state(0);

    const sourcesResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const res = await ofetch<{ success: boolean; data: Source[] }>(
                `/api/getIncomeSources?vaultId=${id}`,
            );
            return res.data ?? [];
        },
    );

    const templatesResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const res = await ofetch<{ success: boolean; data: Template[] }>(
                `/api/getIncomeTemplates?vaultId=${id}`,
            );
            return res.data ?? [];
        },
    );

    const sources = $derived(sourcesResource.current ?? []);
    const templates = $derived(templatesResource.current ?? []);
    const isLoading = $derived(sourcesResource.loading || templatesResource.loading);

    // Inline form state
    let editingId = $state<string | null>(null);
    let isCreating = $state(false);
    let formSourceId = $state<string>('');
    let formName = $state('');
    let formIcon = $state('💰');
    let formAmount = $state<number | undefined>(undefined);
    let formPaidTo = $state<string | null>(null);
    let formFundId = $state<string | null>(null);
    let formNote = $state('');
    let saving = $state(false);

    function startCreate() {
        editingId = null;
        isCreating = true;
        formSourceId = sources[0]?.id ?? '';
        formName = '';
        formIcon = '💰';
        formAmount = undefined;
        formPaidTo = null;
        formFundId = null;
        formNote = '';
    }

    function startEdit(t: Template) {
        isCreating = false;
        editingId = t.id;
        formSourceId = t.sourceId;
        formName = t.name;
        formIcon = t.icon ?? '💰';
        formAmount = t.defaultAmount ?? undefined;
        formPaidTo = t.defaultPaidTo;
        formFundId = t.defaultFundId;
        formNote = t.defaultNote ?? '';
    }

    function cancelEdit() {
        if (saving) return;
        isCreating = false;
        editingId = null;
    }

    async function saveForm() {
        if (!formSourceId) {
            toast.error('Pick a source');
            return;
        }
        if (!formName.trim()) {
            toast.error('Enter a name');
            return;
        }
        saving = true;
        try {
            const body: Record<string, unknown> = {
                vaultId,
                sourceId: formSourceId,
                name: formName.trim(),
                icon: formIcon,
                defaultAmount: formAmount ?? null,
                defaultPaidTo: formPaidTo,
                defaultFundId: formFundId,
                defaultNote: formNote.trim() || null,
            };
            if (isCreating) {
                await ofetch('/api/createIncomeTemplate', {
                    method: 'POST',
                    body,
                    headers: { 'Content-Type': 'application/json' },
                });
                toast.success('Template created');
            } else if (editingId) {
                body.id = editingId;
                await ofetch('/api/updateIncomeTemplate', {
                    method: 'POST',
                    body,
                    headers: { 'Content-Type': 'application/json' },
                });
                toast.success('Template updated');
            }
            isCreating = false;
            editingId = null;
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to save');
        } finally {
            saving = false;
        }
    }

    async function handleDelete(t: Template) {
        if (!confirm(`Delete template "${t.name}"? Existing entries keep their record but lose the template label.`)) return;
        try {
            await ofetch('/api/deleteIncomeTemplate', {
                method: 'POST',
                body: { vaultId, id: t.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Template deleted');
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to delete');
        }
    }

    const sourceLabel = $derived((id: string) => sources.find((s) => s.id === id)?.name ?? 'Source');
</script>

<svelte:head>
    <title>Income Templates - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4 [&>*+*]:mt-6">
    <div class="flex items-end gap-2 mb-2">
        <header class="flex-1">
            <button
                type="button"
                onclick={() => goto(`/vaults/${vaultId}/income`)}
                class="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"
            >
                <ArrowLeft class="size-3" />
                Back to income
            </button>
            <Eyebrow tone="muted">— The household ledger —</Eyebrow>
            <h1 class="dg-page-title">Income <em>templates</em>.</h1>
            <p class="dg-page-sub">Reusable pre-fills tied to a source. One per recurring stream — e.g. "Salary — main job", "Quarterly bonus".</p>
        </header>
        {#if !isCreating && editingId === null}
            <Button size="sm" onclick={startCreate} disabled={sources.length === 0}>
                <Plus class="size-4" />
                <span>New template</span>
            </Button>
        {/if}
    </div>
    <Rule variant="double" />

    {#if sources.length === 0}
        <Card>
            <CardContent class="py-6 text-center space-y-3">
                <p class="text-sm text-muted-foreground">Create at least one source first — templates reference a source.</p>
                <Button size="sm" variant="outline" onclick={() => goto(`/vaults/${vaultId}/income/sources`)}>
                    Manage sources
                </Button>
            </CardContent>
        </Card>
    {/if}

    {#if isCreating || editingId !== null}
        <Card>
            <CardContent class="py-4 space-y-4">
                <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {isCreating ? 'New template' : 'Edit template'}
                </p>
                <div class="grid gap-3 sm:grid-cols-2">
                    <div class="space-y-1">
                        <Label for="tpl-source">Source <span class="text-destructive">*</span></Label>
                        <input type="hidden" name="sourceId" value={formSourceId} />
                        <Select.Root
                            type="single"
                            value={formSourceId}
                            onValueChange={(v: string | undefined) => (formSourceId = v ?? '')}
                        >
                            <Select.Trigger id="tpl-source" class="w-full" disabled={saving}>
                                {sourceLabel(formSourceId)}
                            </Select.Trigger>
                            <Select.Content>
                                {#each sources as src}
                                    <Select.Item value={src.id} label={src.name} />
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div class="space-y-1">
                        <Label for="tpl-name">Name <span class="text-destructive">*</span></Label>
                        <Input id="tpl-name" bind:value={formName} disabled={saving} placeholder="e.g., Salary - Firdaus" />
                    </div>
                </div>
                <IconCombobox
                    name="tpl-icon"
                    label="Icon"
                    icons={iconData.icons}
                    bind:value={formIcon}
                    disabled={saving}
                    placeholder="Search icons..."
                />

                <div class="grid gap-3 sm:grid-cols-2">
                    <div class="space-y-1">
                        <Label for="tpl-amount">Default amount</Label>
                        <CalculatorInput id="tpl-amount" bind:value={formAmount} disabled={saving} placeholder="0.00" />
                    </div>
                    {#if data.funds.length > 0}
                        <div class="space-y-1">
                            <Label>Default fund top-up</Label>
                            <Select.Root
                                type="single"
                                value={formFundId ?? ''}
                                onValueChange={(v: string | undefined) => (formFundId = v || null)}
                            >
                                <Select.Trigger class="w-full" disabled={saving}>
                                    {data.funds.find((f) => f.id === formFundId)?.name ?? '— none —'}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="" label="— none —" />
                                    {#each data.funds as fund}
                                        <Select.Item value={fund.id} label={fund.name} />
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>
                    {/if}
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                    <div class="space-y-1">
                        <Label>Default paid to</Label>
                        <Select.Root
                            type="single"
                            value={formPaidTo ?? ''}
                            onValueChange={(v: string | undefined) => (formPaidTo = v || null)}
                        >
                            <Select.Trigger class="w-full" disabled={saving}>
                                {data.members.find((m) => m.userId === formPaidTo)?.displayName ?? 'Vault-level'}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="" label="Vault-level" />
                                {#each data.members as member}
                                    <Select.Item value={member.userId} label={member.displayName} />
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div class="space-y-1">
                        <Label for="tpl-note">Default note</Label>
                        <Textarea id="tpl-note" bind:value={formNote} disabled={saving} rows={2} placeholder="Optional context" />
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onclick={cancelEdit} disabled={saving}>Cancel</Button>
                    <Button size="sm" onclick={saveForm} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                </div>
            </CardContent>
        </Card>
    {/if}

    {#if isLoading && templates.length === 0}
        <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full size-10 border-b-2 border-primary"></div>
        </div>
    {:else if templates.length === 0 && sources.length > 0 && !isCreating}
        <Card>
            <CardContent class="py-10">
                <EmptyState
                    icon={FileText}
                    title="No templates yet"
                    description="Templates pre-fill the new-income form. Useful for recurring streams like salary, retirement withdrawals, or regular side income."
                >
                    {#snippet primary()}
                        <Button size="sm" onclick={startCreate}>
                            <Plus class="size-4" />
                            New template
                        </Button>
                    {/snippet}
                </EmptyState>
            </CardContent>
        </Card>
    {:else if templates.length > 0}
        <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
            {#each templates as tpl (tpl.id)}
                <div class="flex items-center gap-3 px-3 py-2.5">
                    <span class="text-xl leading-none shrink-0" aria-hidden="true">{tpl.icon ?? '💰'}</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium break-words">{tpl.name}</p>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            <span class="inline-flex items-center gap-1">
                                <span aria-hidden="true">{tpl.source.icon ?? '💰'}</span>
                                {tpl.source.name ?? 'Source'}
                            </span>
                            {#if tpl.defaultAmount}
                                <span class="opacity-50">·</span>
                                <span class="font-mono">{tpl.defaultAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            {/if}
                            {#if tpl.usageCount > 0}
                                <span class="opacity-50">·</span>
                                used {tpl.usageCount}×
                            {/if}
                        </p>
                    </div>
                    <button
                        type="button"
                        onclick={() => startEdit(tpl)}
                        class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground"
                        aria-label="Edit"
                        title="Edit"
                    >
                        <Pencil class="size-4" />
                    </button>
                    <button
                        type="button"
                        onclick={() => handleDelete(tpl)}
                        class="p-1.5 rounded-[var(--radius-sm)] hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                        title="Delete"
                    >
                        <Trash2 class="size-4" />
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>

<Toaster />
