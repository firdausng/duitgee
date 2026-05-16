<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { createIncomeEntrySchema } from '$lib/schemas/income';
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { CalculatorInput } from '$lib/components/ui/calculator-input';
    import { DateTimePicker } from '$lib/components/ui/date-time-picker';
    import { IconCombobox } from '$lib/components/ui/icon-combobox';
    import { iconData } from '$lib/configurations/icons';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { localDatetimeToUtcIso } from '$lib/utils';
    import Plus from '@lucide/svelte/icons/plus';

    let { data } = $props();

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(createIncomeEntrySchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fix the highlighted fields');
                return;
            }
            if (templateMode === 'new' && !newTemplateName.trim()) {
                toast.error('Enter a name for the new template');
                return;
            }
            if (templateMode === 'new' && !form.data.sourceId) {
                toast.error('Pick a source for the new template');
                return;
            }

            try {
                // When breakdown is in use, send baseAmount + the line lists.
                // The server resolves them and computes `amount` = base + sum(allowances).
                const breakdownPayload = showBreakdown
                    ? {
                          baseAmount: form.data.amount,
                          allowances: allowanceLines,
                          deductions: deductionLines,
                      }
                    : {};

                if (templateMode === 'new') {
                    const payload = {
                        vaultId: data.vaultId,
                        sourceId: form.data.sourceId,
                        templateName: newTemplateName.trim(),
                        templateIcon: newTemplateIcon || '💰',
                        amount: form.data.amount,
                        date: localDatetimeToUtcIso(form.data.date),
                        paidTo: form.data.paidTo,
                        note: form.data.note,
                        fundId: form.data.fundId,
                        ...breakdownPayload,
                    };
                    const response = await ofetch('/api/createIncomeEntryWithTemplate', {
                        method: 'POST',
                        body: payload,
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (response.success === false) {
                        toast.error(response.error || 'Failed to create');
                        return;
                    }
                    toast.success('Income recorded · new template created');
                } else {
                    const payload = {
                        ...form.data,
                        date: localDatetimeToUtcIso(form.data.date),
                        ...breakdownPayload,
                    };
                    const response = await ofetch('/api/createIncomeEntry', {
                        method: 'POST',
                        body: payload,
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (response.success === false) {
                        toast.error(response.error || 'Failed to create');
                        return;
                    }
                    toast.success('Income recorded');
                }
                await goto(`/vaults/${data.vaultId}/income`);
            } catch (error: any) {
                toast.error(error?.data?.error || error?.message || 'Failed to record income');
            }
        },
    });

    type TemplateMode = 'existing' | 'new' | 'none';
    // Default to existing when templates exist for any source; otherwise default to 'none'.
    let templateMode = $state<TemplateMode>(data.templates.length > 0 ? 'existing' : 'none');
    let newTemplateName = $state('');
    let newTemplateIcon = $state('💰');

    // ─── Salary breakdown ────────────────────────────────────────────────
    type BreakdownLine = {
        label: string;
        mode: 'percent' | 'fixed';
        rate?: number;
        amount?: number;
        categoryName?: string | null;
    };
    let showBreakdown = $state(false);
    let allowanceLines = $state<BreakdownLine[]>([]);
    let deductionLines = $state<BreakdownLine[]>([]);

    function parseLineJson(raw: string | null | undefined): BreakdownLine[] {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as BreakdownLine[]) : [];
        } catch {
            return [];
        }
    }

    function lineEffective(l: BreakdownLine, base: number): number {
        const v =
            l.mode === 'percent'
                ? base * (l.rate ?? 0)
                : (l.amount ?? 0);
        return Math.round(v * 100) / 100;
    }

    const baseSalary = $derived($form.amount || 0);
    const resolvedAllowances = $derived(
        allowanceLines.map((l) => ({ ...l, computed: lineEffective(l, baseSalary) })),
    );
    const grossAmount = $derived(
        Math.round(
            (baseSalary + resolvedAllowances.reduce((s, a) => s + a.computed, 0)) * 100,
        ) / 100,
    );
    const resolvedDeductions = $derived(
        deductionLines.map((l) => ({ ...l, computed: lineEffective(l, grossAmount) })),
    );
    const totalDeductions = $derived(
        Math.round(resolvedDeductions.reduce((s, d) => s + d.computed, 0) * 100) / 100,
    );
    const netTakeHome = $derived(Math.round((grossAmount - totalDeductions) * 100) / 100);

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

    // Templates filtered by the selected source.
    const filteredTemplates = $derived(
        $form.sourceId ? data.templates.filter((t) => t.sourceId === $form.sourceId) : [],
    );

    function pickSource(sourceId: string | null) {
        $form.sourceId = sourceId;
        // Clear the chosen template when source changes — it might not belong.
        if ($form.templateId && !data.templates.find((t) => t.id === $form.templateId && t.sourceId === sourceId)) {
            $form.templateId = null;
        }
    }

    function pickTemplate(templateId: string) {
        const tpl = data.templates.find((t) => t.id === templateId);
        if (!tpl) return;
        $form.templateId = tpl.id;
        $form.sourceId = tpl.sourceId;
        // Pre-fill the entry fields from template defaults.
        if (!$form.amount && tpl.defaultAmount) $form.amount = tpl.defaultAmount;
        if (!$form.paidTo && tpl.defaultPaidTo) $form.paidTo = tpl.defaultPaidTo;
        if (!$form.fundId && tpl.defaultFundId) $form.fundId = tpl.defaultFundId;
        if (!$form.note && tpl.defaultNote) $form.note = tpl.defaultNote;
        // Seed breakdown lines from the template's defaults. The template
        // ships them as JSON strings (text columns) — parse before assigning.
        const tplAllowances = parseLineJson(tpl.defaultAllowances);
        const tplDeductions = parseLineJson(tpl.defaultDeductions);
        if (tplAllowances.length > 0 || tplDeductions.length > 0) {
            allowanceLines = tplAllowances;
            deductionLines = tplDeductions;
            showBreakdown = true;
        }
    }

    function handleBack() {
        goto(`/vaults/${data.vaultId}/income`);
    }
</script>

<svelte:head>
    <title>New Income - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <header class="mb-2">
        <Eyebrow tone="muted">Plate § New income</Eyebrow>
        <h1 class="dg-page-title">A new <em>income</em> entry.</h1>
        <p class="dg-page-sub">Money arriving — salary, side income, refund, gift.</p>
    </header>
    <Rule variant="double" />
    <div class="mb-6"></div>

    {#if data.sources.length === 0}
        <Card class="mb-4">
            <CardContent class="py-6 text-center space-y-3">
                <p class="text-sm text-muted-foreground">No income sources yet. Create at least one source (e.g. "Salary") before recording income.</p>
                <Button size="sm" onclick={() => goto(`/vaults/${data.vaultId}/income/sources`)}>
                    <Plus class="size-4" />
                    Manage sources
                </Button>
            </CardContent>
        </Card>
    {/if}

    <Card>
        <CardHeader>
            <CardTitle>Income</CardTitle>
            <CardDescription>
                Pick the source (kind) and optionally a template for pre-fills. Templates speed up recurring entries; ad-hoc income tags a source but skips the template.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form method="POST" use:enhance class="space-y-6">
                <input type="hidden" name="vaultId" bind:value={$form.vaultId} />

                <!-- Source picker (taxonomy) -->
                <div class="space-y-2">
                    <Label>Source <span class="text-destructive">*</span></Label>
                    <input type="hidden" name="sourceId" value={$form.sourceId ?? ''} />
                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

                <!-- Template mode toggle (only meaningful when a source is picked) -->
                {#if $form.sourceId}
                    <div class="space-y-2">
                        <Label>Template</Label>
                        <div class="inline-flex rounded-md border overflow-hidden" role="group" aria-label="Template mode">
                            <button
                                type="button"
                                onclick={() => { templateMode = 'existing'; }}
                                disabled={$delayed || filteredTemplates.length === 0}
                                class="px-3 py-1.5 text-xs {templateMode === 'existing' ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}"
                            >
                                Existing
                            </button>
                            <button
                                type="button"
                                onclick={() => { templateMode = 'new'; $form.templateId = null; }}
                                disabled={$delayed}
                                class="px-3 py-1.5 text-xs border-l {templateMode === 'new' ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}"
                            >
                                <Plus class="size-3 inline -mt-0.5" /> New template
                            </button>
                            <button
                                type="button"
                                onclick={() => { templateMode = 'none'; $form.templateId = null; }}
                                disabled={$delayed}
                                class="px-3 py-1.5 text-xs border-l {templateMode === 'none' ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}"
                            >
                                Skip template
                            </button>
                        </div>
                    </div>

                    {#if templateMode === 'existing'}
                        {#if filteredTemplates.length === 0}
                            <p class="text-xs text-muted-foreground">No templates under this source yet — switch to "New template" or "Skip".</p>
                        {:else}
                            <input type="hidden" name="templateId" value={$form.templateId ?? ''} />
                            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                        {/if}
                    {:else if templateMode === 'new'}
                        <div class="space-y-2">
                            <Label for="newTemplateName">New template name <span class="text-destructive">*</span></Label>
                            <Input
                                id="newTemplateName"
                                bind:value={newTemplateName}
                                disabled={$delayed}
                                placeholder="e.g., Salary - Firdaus"
                            />
                        </div>
                        <IconCombobox
                            name="newTemplateIcon"
                            label="New template icon"
                            icons={iconData.icons}
                            bind:value={newTemplateIcon}
                            disabled={$delayed}
                            placeholder="Search icons..."
                        />
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
                    {#if $errors.date}
                        <p class="text-sm text-destructive">{$errors.date}</p>
                    {/if}
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

                <!-- Salary breakdown (allowances + deductions) -->
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
                            Use this for salary income with allowances (elaun) or deductions (tax, retirement, social). The Amount above becomes the base; allowances add on top; deductions auto-create linked expense rows.
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
                                <p class="text-[11px] text-muted-foreground italic">No allowances. Click "Add line" to include one.</p>
                            {/if}
                            {#each allowanceLines as line, i (i)}
                                {@const computed = resolvedAllowances[i]?.computed ?? 0}
                                <div class="grid grid-cols-[1fr_70px_100px_70px_auto] gap-2 items-center">
                                    <Input bind:value={line.label} placeholder="e.g. Elaun" disabled={$delayed} class="h-8 text-sm" />
                                    <select bind:value={line.mode} disabled={$delayed} class="h-8 rounded-md border border-input bg-background px-2 text-xs">
                                        <option value="fixed">RM</option>
                                        <option value="percent">%</option>
                                    </select>
                                    {#if line.mode === 'percent'}
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={line.rate ? line.rate * 100 : 0}
                                            oninput={(e) => (line.rate = Number((e.currentTarget as HTMLInputElement).value) / 100)}
                                            disabled={$delayed}
                                            class="h-8 text-sm"
                                            placeholder="0.00"
                                        />
                                    {:else}
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            bind:value={line.amount}
                                            disabled={$delayed}
                                            class="h-8 text-sm"
                                            placeholder="0.00"
                                        />
                                    {/if}
                                    <span class="text-xs text-right tabular-nums text-muted-foreground">{computed.toFixed(2)}</span>
                                    <button type="button" onclick={() => removeAllowance(i)} disabled={$delayed} class="text-muted-foreground hover:text-destructive p-1" aria-label="Remove allowance">
                                        ×
                                    </button>
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
                            <p class="text-[11px] text-muted-foreground italic">
                                Each row creates a linked expense. Edit on income only — the expense list will lock them.
                            </p>
                            {#each deductionLines as line, i (i)}
                                {@const computed = resolvedDeductions[i]?.computed ?? 0}
                                <div class="grid grid-cols-[1fr_70px_100px_140px_70px_auto] gap-2 items-center">
                                    <Input bind:value={line.label} placeholder="e.g. Tax" disabled={$delayed} class="h-8 text-sm" />
                                    <select bind:value={line.mode} disabled={$delayed} class="h-8 rounded-md border border-input bg-background px-2 text-xs">
                                        <option value="percent">%</option>
                                        <option value="fixed">RM</option>
                                    </select>
                                    {#if line.mode === 'percent'}
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={line.rate ? line.rate * 100 : 0}
                                            oninput={(e) => (line.rate = Number((e.currentTarget as HTMLInputElement).value) / 100)}
                                            disabled={$delayed}
                                            class="h-8 text-sm"
                                            placeholder="0.00"
                                        />
                                    {:else}
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            bind:value={line.amount}
                                            disabled={$delayed}
                                            class="h-8 text-sm"
                                            placeholder="0.00"
                                        />
                                    {/if}
                                    <Input
                                        bind:value={line.categoryName}
                                        placeholder="Salary deductions"
                                        disabled={$delayed}
                                        class="h-8 text-sm"
                                    />
                                    <span class="text-xs text-right tabular-nums text-muted-foreground">{computed.toFixed(2)}</span>
                                    <button type="button" onclick={() => removeDeduction(i)} disabled={$delayed} class="text-muted-foreground hover:text-destructive p-1" aria-label="Remove deduction">
                                        ×
                                    </button>
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
                        placeholder="Optional context"
                        rows={2}
                    />
                </div>

                <!-- Actions -->
                <div class="flex gap-3">
                    <Button type="button" variant="outline" onclick={handleBack} disabled={$delayed}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={$delayed} class="flex-1">
                        {$delayed ? 'Recording…' : 'Record income'}
                    </Button>
                </div>
            </form>
        </CardContent>
    </Card>
</div>

<Toaster />
