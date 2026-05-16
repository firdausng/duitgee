<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { updateIncomeEntrySchema } from '$lib/schemas/income';
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { Button } from '$lib/components/ui/button';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { Input } from '$lib/components/ui/input';
    import { CalculatorInput } from '$lib/components/ui/calculator-input';
    import { DateTimePicker } from '$lib/components/ui/date-time-picker';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { localDatetimeToUtcIso } from '$lib/utils';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import Plus from '@lucide/svelte/icons/plus';

    let { data } = $props();

    // ─── Salary breakdown — same shape as the new-income form ────────────
    type BreakdownLine = {
        label: string;
        mode: 'percent' | 'fixed';
        rate?: number;
        amount?: number;
        categoryName?: string | null;
    };

    function parseLineJson(raw: string | null | undefined): BreakdownLine[] {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as BreakdownLine[]) : [];
        } catch {
            return [];
        }
    }

    // Strip computedAmount from the snapshot — the editor uses the config-only shape.
    function stripComputed(lines: any[]): BreakdownLine[] {
        return lines.map(({ computedAmount, ...rest }) => rest as BreakdownLine);
    }

    let allowanceLines = $state<BreakdownLine[]>(
        stripComputed(parseLineJson(data.entry.allowances as unknown as string | null)),
    );
    let deductionLines = $state<BreakdownLine[]>(
        stripComputed(parseLineJson(data.entry.deductions as unknown as string | null)),
    );
    let showBreakdown = $state(
        (data.entry.allowances && data.entry.allowances !== '[]') ||
        (data.entry.deductions && data.entry.deductions !== '[]') ||
        data.entry.baseAmount !== null,
    );

    function lineEffective(l: BreakdownLine, base: number): number {
        const v = l.mode === 'percent' ? base * (l.rate ?? 0) : (l.amount ?? 0);
        return Math.round(v * 100) / 100;
    }

    function addAllowance() {
        allowanceLines = [...allowanceLines, { label: '', mode: 'fixed', amount: 0 }];
        if (!showBreakdown) showBreakdown = true;
    }
    function removeAllowance(i: number) {
        allowanceLines = allowanceLines.filter((_, idx) => idx !== i);
    }
    function addDeduction() {
        deductionLines = [
            ...deductionLines,
            { label: '', mode: 'percent', rate: 0, categoryName: 'Salary deductions' },
        ];
        if (!showBreakdown) showBreakdown = true;
    }
    function removeDeduction(i: number) {
        deductionLines = deductionLines.filter((_, idx) => idx !== i);
    }

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(updateIncomeEntrySchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fix the highlighted fields');
                return;
            }
            try {
                // When breakdown is shown, include the lines so the server
                // re-resolves + diffs against the existing snapshot.
                const breakdownPayload = showBreakdown
                    ? {
                          baseAmount: form.data.amount,
                          allowances: allowanceLines,
                          deductions: deductionLines,
                      }
                    : {
                          // Explicitly clear the breakdown if user toggled it off.
                          baseAmount: null,
                          allowances: [],
                          deductions: [],
                      };
                const payload = {
                    ...form.data,
                    date: form.data.date ? localDatetimeToUtcIso(form.data.date) : undefined,
                    ...breakdownPayload,
                };
                const response = await ofetch('/api/updateIncomeEntry', {
                    method: 'POST',
                    body: payload,
                    headers: { 'Content-Type': 'application/json' },
                });
                if (response.success === false) {
                    toast.error(response.error || 'Failed to save');
                    return;
                }
                toast.success('Income entry updated');
                await goto(`/vaults/${data.vaultId}/income`);
            } catch (error: any) {
                toast.error(error?.data?.error || error?.message || 'Failed to save');
            }
        },
    });

    let deleting = $state(false);

    // ─── Breakdown derived computations (after $form is in scope) ────────
    const baseSalary = $derived($form.amount || 0);
    const resolvedAllowances = $derived(
        allowanceLines.map((l) => ({ ...l, computed: lineEffective(l, baseSalary) })),
    );
    const grossAmount = $derived(
        Math.round((baseSalary + resolvedAllowances.reduce((s, a) => s + a.computed, 0)) * 100) / 100,
    );
    const resolvedDeductions = $derived(
        deductionLines.map((l) => ({ ...l, computed: lineEffective(l, grossAmount) })),
    );
    const totalDeductions = $derived(
        Math.round(resolvedDeductions.reduce((s, d) => s + d.computed, 0) * 100) / 100,
    );
    const netTakeHome = $derived(Math.round((grossAmount - totalDeductions) * 100) / 100);

    const filteredTemplates = $derived(
        $form.sourceId ? data.templates.filter((t) => t.sourceId === $form.sourceId) : [],
    );

    function pickSource(sourceId: string | null) {
        $form.sourceId = sourceId;
        if ($form.templateId && !data.templates.find((t) => t.id === $form.templateId && t.sourceId === sourceId)) {
            $form.templateId = null;
        }
    }

    function pickTemplate(templateId: string | null) {
        $form.templateId = templateId;
        if (templateId) {
            const tpl = data.templates.find((t) => t.id === templateId);
            if (tpl) $form.sourceId = tpl.sourceId;
        }
    }

    async function handleDelete() {
        if (!confirm('Delete this income entry? If it topped up a fund, that top-up will be reversed.')) return;
        deleting = true;
        try {
            await ofetch('/api/deleteIncomeEntry', {
                method: 'POST',
                body: { vaultId: data.vaultId, id: data.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Income entry deleted');
            await goto(`/vaults/${data.vaultId}/income`);
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to delete');
        } finally {
            deleting = false;
        }
    }
</script>

<svelte:head>
    <title>Edit Income - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <header class="mb-2">
        <Eyebrow tone="muted">Plate § Edit income</Eyebrow>
        <h1 class="dg-page-title">Edit <em>income</em>.</h1>
    </header>
    <Rule variant="double" />
    <div class="mb-6"></div>

    <Card>
        <CardHeader>
            <CardTitle>Income</CardTitle>
        </CardHeader>
        <CardContent>
            <form method="POST" use:enhance class="space-y-6">
                <input type="hidden" name="id" bind:value={$form.id} />
                <input type="hidden" name="vaultId" bind:value={$form.vaultId} />
                <input type="hidden" name="sourceId" value={$form.sourceId ?? ''} />
                <input type="hidden" name="templateId" value={$form.templateId ?? ''} />

                <!-- Source picker -->
                {#if data.sources.length > 0}
                    <div class="space-y-2">
                        <Label>Source</Label>
                        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <button
                                type="button"
                                onclick={() => pickSource(null)}
                                disabled={$delayed}
                                class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                    {!$form.sourceId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                            >
                                <span class="text-xl">—</span>
                                <span class="leading-tight">Ad-hoc</span>
                            </button>
                            {#each data.sources as src}
                                <button
                                    type="button"
                                    onclick={() => pickSource(src.id)}
                                    disabled={$delayed}
                                    class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                        {$form.sourceId === src.id ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1' : 'border-input'}"
                                >
                                    <span class="text-xl">{src.icon ?? '💰'}</span>
                                    <span class="leading-tight line-clamp-2">{src.name}</span>
                                </button>
                            {/each}
                        </div>
                    </div>

                    {#if $form.sourceId && filteredTemplates.length > 0}
                        <div class="space-y-2">
                            <Label>Template</Label>
                            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                <button
                                    type="button"
                                    onclick={() => pickTemplate(null)}
                                    disabled={$delayed}
                                    class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                        {!$form.templateId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                                >
                                    <span class="text-xl">—</span>
                                    <span class="leading-tight">No template</span>
                                </button>
                                {#each filteredTemplates as tpl}
                                    <button
                                        type="button"
                                        onclick={() => pickTemplate(tpl.id)}
                                        disabled={$delayed}
                                        class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                            {$form.templateId === tpl.id ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1' : 'border-input'}"
                                    >
                                        <span class="text-xl">{tpl.icon ?? '💰'}</span>
                                        <span class="leading-tight line-clamp-2">{tpl.name}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/if}

                <!-- Amount -->
                <div class="space-y-2">
                    <Label for="amount">Amount <span class="text-destructive">*</span></Label>
                    <CalculatorInput
                        id="amount"
                        name="amount"
                        bind:value={$form.amount}
                        disabled={$delayed}
                        placeholder="0.00"
                        error={!!$errors.amount}
                    />
                    {#if $errors.amount}
                        <p class="text-sm text-destructive">{$errors.amount}</p>
                    {/if}
                </div>

                <!-- Date -->
                <div class="space-y-2">
                    <Label for="date">Date <span class="text-destructive">*</span></Label>
                    <DateTimePicker
                        id="date"
                        name="date"
                        bind:value={$form.date}
                        disabled={$delayed}
                        showTime={false}
                    />
                </div>

                <!-- Paid to -->
                <div class="space-y-2">
                    <Label>Paid to</Label>
                    <input type="hidden" name="paidTo" value={$form.paidTo ?? ''} />
                    <div class="grid grid-cols-3 gap-1">
                        <button
                            type="button"
                            onclick={() => ($form.paidTo = null)}
                            disabled={$delayed}
                            class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                {!$form.paidTo ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                        >
                            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-base">—</span>
                            <span class="leading-tight">Vault-level</span>
                        </button>
                        {#each data.members as member}
                            <button
                                type="button"
                                onclick={() => ($form.paidTo = member.userId)}
                                disabled={$delayed}
                                class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                    {$form.paidTo === member.userId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                            >
                                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                    {member.displayName.charAt(0).toUpperCase()}
                                </span>
                                <span class="leading-tight line-clamp-2">{member.displayName}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Fund routing -->
                {#if data.funds.length > 0}
                    <div class="space-y-2">
                        <Label>Top up a fund (optional)</Label>
                        <input type="hidden" name="fundId" value={$form.fundId ?? ''} />
                        <div class="grid grid-cols-3 gap-1">
                            <button
                                type="button"
                                onclick={() => ($form.fundId = null)}
                                disabled={$delayed}
                                class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                    {!$form.fundId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                            >
                                <span class="text-xl">—</span>
                                <span class="leading-tight">No fund</span>
                            </button>
                            {#each data.funds as fund}
                                <button
                                    type="button"
                                    onclick={() => ($form.fundId = fund.id)}
                                    disabled={$delayed}
                                    class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                        {$form.fundId === fund.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                                >
                                    <span class="text-xl">{fund.icon ?? '💰'}</span>
                                    <span class="leading-tight line-clamp-2">{fund.name}</span>
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- Salary breakdown -->
                <div class="space-y-3">
                    <div class="flex items-center justify-between gap-2">
                        <Label class="m-0">Salary breakdown <span class="font-normal text-muted-foreground">(optional)</span></Label>
                        {#if !showBreakdown}
                            <button type="button" class="text-xs text-primary hover:underline" onclick={() => (showBreakdown = true)}>
                                Add breakdown
                            </button>
                        {:else}
                            <button type="button" class="text-xs text-muted-foreground hover:text-foreground" onclick={() => { showBreakdown = false; allowanceLines = []; deductionLines = []; }}>
                                Hide
                            </button>
                        {/if}
                    </div>

                    {#if showBreakdown}
                        <p class="text-xs text-muted-foreground">
                            The Amount above is the base salary; allowances add on top to compute gross; deductions create linked expense rows. Edits cascade — saving here updates the linked expenses.
                        </p>

                        <!-- Allowances -->
                        <div class="rounded-md border bg-card p-3 space-y-2">
                            <div class="flex items-center justify-between">
                                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Allowances</p>
                                <button type="button" onclick={addAllowance} disabled={$delayed} class="text-xs text-primary hover:underline inline-flex items-center gap-1">
                                    <Plus class="size-3" /> Add line
                                </button>
                            </div>
                            {#if allowanceLines.length === 0}
                                <p class="text-[11px] text-muted-foreground italic">No allowances.</p>
                            {/if}
                            {#each allowanceLines as line, i (i)}
                                {@const computed = resolvedAllowances[i]?.computed ?? 0}
                                <div class="grid grid-cols-[70px_minmax(0,1fr)_auto_auto] items-center gap-2 sm:grid-cols-[1fr_70px_100px_70px_auto]">
                                    <Input bind:value={line.label} placeholder="e.g. Elaun" disabled={$delayed} class="col-span-4 h-8 text-sm sm:col-span-1" />
                                    <select bind:value={line.mode} disabled={$delayed} class="h-8 rounded-md border border-input bg-background px-2 text-xs">
                                        <option value="fixed">RM</option>
                                        <option value="percent">%</option>
                                    </select>
                                    {#if line.mode === 'percent'}
                                        <Input type="number" step="0.01" min="0" max="100" value={line.rate ? line.rate * 100 : 0} oninput={(e) => (line.rate = Number((e.currentTarget as HTMLInputElement).value) / 100)} disabled={$delayed} class="h-8 text-sm" placeholder="0.00" />
                                    {:else}
                                        <Input type="number" step="0.01" min="0" bind:value={line.amount} disabled={$delayed} class="h-8 text-sm" placeholder="0.00" />
                                    {/if}
                                    <span class="text-xs text-right tabular-nums text-muted-foreground">{computed.toFixed(2)}</span>
                                    <button type="button" onclick={() => removeAllowance(i)} disabled={$delayed} class="text-muted-foreground hover:text-destructive p-1" aria-label="Remove allowance">×</button>
                                </div>
                            {/each}
                        </div>

                        <div class="text-xs text-muted-foreground text-center">
                            Computed gross: <span class="font-mono tabular-nums text-foreground">{grossAmount.toFixed(2)}</span>
                            <span class="opacity-60">(base {baseSalary.toFixed(2)} + allowances {(grossAmount - baseSalary).toFixed(2)})</span>
                        </div>

                        <!-- Deductions -->
                        <div class="rounded-md border bg-card p-3 space-y-2">
                            <div class="flex items-center justify-between">
                                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deductions</p>
                                <button type="button" onclick={addDeduction} disabled={$delayed} class="text-xs text-primary hover:underline inline-flex items-center gap-1">
                                    <Plus class="size-3" /> Add line
                                </button>
                            </div>
                            <p class="text-[11px] text-muted-foreground italic">Each row creates a linked expense.</p>
                            {#each deductionLines as line, i (i)}
                                {@const computed = resolvedDeductions[i]?.computed ?? 0}
                                <div class="grid grid-cols-[70px_minmax(0,1fr)_auto_auto] items-center gap-2 sm:grid-cols-[1fr_70px_100px_140px_70px_auto]">
                                    <Input bind:value={line.label} placeholder="e.g. Tax" disabled={$delayed} class="col-span-4 h-8 text-sm sm:col-span-1" />
                                    <select bind:value={line.mode} disabled={$delayed} class="h-8 rounded-md border border-input bg-background px-2 text-xs">
                                        <option value="percent">%</option>
                                        <option value="fixed">RM</option>
                                    </select>
                                    {#if line.mode === 'percent'}
                                        <Input type="number" step="0.01" min="0" max="100" value={line.rate ? line.rate * 100 : 0} oninput={(e) => (line.rate = Number((e.currentTarget as HTMLInputElement).value) / 100)} disabled={$delayed} class="h-8 text-sm" placeholder="0.00" />
                                    {:else}
                                        <Input type="number" step="0.01" min="0" bind:value={line.amount} disabled={$delayed} class="h-8 text-sm" placeholder="0.00" />
                                    {/if}
                                    <span class="text-xs text-right tabular-nums text-muted-foreground">{computed.toFixed(2)}</span>
                                    <button type="button" onclick={() => removeDeduction(i)} disabled={$delayed} class="text-muted-foreground hover:text-destructive p-1" aria-label="Remove deduction">×</button>
                                    <Input bind:value={line.categoryName} placeholder="Salary deductions" disabled={$delayed} class="col-span-4 h-8 text-sm sm:col-span-1 sm:col-start-4 sm:row-start-1" />
                                </div>
                            {/each}
                        </div>

                        <div class="rounded-md bg-muted/40 px-3 py-2 text-xs space-y-0.5">
                            <div class="flex justify-between"><span>Gross</span><span class="font-mono tabular-nums">{grossAmount.toFixed(2)}</span></div>
                            <div class="flex justify-between"><span>Deductions</span><span class="font-mono tabular-nums text-destructive">−{totalDeductions.toFixed(2)}</span></div>
                            <div class="flex justify-between border-t pt-1 font-medium"><span>Net to take-home</span><span class="font-mono tabular-nums">{netTakeHome.toFixed(2)}</span></div>
                        </div>
                    {/if}
                </div>

                <!-- Note -->
                <div class="space-y-2">
                    <Label for="note">Note (optional)</Label>
                    <Textarea
                        id="note"
                        name="note"
                        bind:value={$form.note}
                        disabled={$delayed}
                        rows={2}
                    />
                </div>

                <!-- Actions -->
                <div class="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onclick={() => goto(`/vaults/${data.vaultId}/income`)} disabled={$delayed}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={$delayed} class="flex-1">
                        {$delayed ? 'Saving…' : 'Save'}
                    </Button>
                </div>

                <div class="flex justify-end pt-4 border-t">
                    <Button type="button" variant="ghost" size="sm" onclick={handleDelete} disabled={deleting || $delayed} class="text-destructive hover:text-destructive">
                        <Trash2 class="size-3.5" />
                        Delete entry
                    </Button>
                </div>
            </form>
        </CardContent>
    </Card>
</div>

<Toaster />
