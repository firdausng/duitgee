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
                        <div class="grid gap-3 sm:grid-cols-[1fr_120px]">
                            <div class="space-y-2">
                                <Label for="newTemplateName">New template name <span class="text-destructive">*</span></Label>
                                <Input
                                    id="newTemplateName"
                                    bind:value={newTemplateName}
                                    disabled={$delayed}
                                    placeholder="e.g., Salary - Firdaus"
                                />
                            </div>
                            <div class="space-y-2">
                                <Label for="newTemplateIcon">Icon</Label>
                                <Input
                                    id="newTemplateIcon"
                                    bind:value={newTemplateIcon}
                                    disabled={$delayed}
                                    placeholder="💰"
                                />
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
