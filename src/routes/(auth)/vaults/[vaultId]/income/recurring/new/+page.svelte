<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { createRecurringIncomeSchema } from '$lib/schemas/recurringIncome';
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { CalculatorInput } from '$lib/components/ui/calculator-input';
    import { DateTimePicker } from '$lib/components/ui/date-time-picker';
    import * as Select from '$lib/components/ui/select';
    import * as RadioGroup from '$lib/components/ui/radio-group';
    import { CheckboxRow } from '$lib/components/ui/checkbox-row';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { localDatetimeToUtcIso } from '$lib/utils';
    import { computeNextOccurrence, type ScheduleUnit } from '$lib/utils/recurringSchedule';

    const FREQUENCY_LABEL: Record<'day' | 'week' | 'month' | 'year', string> = {
        day: 'Daily',
        week: 'Weekly',
        month: 'Monthly',
        year: 'Yearly',
    };
    const BACKFILL_CAP = 50;

    let { data } = $props();

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(createRecurringIncomeSchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fix the highlighted fields');
                return;
            }
            if (!form.data.templateId) {
                toast.error('Pick a template');
                return;
            }
            try {
                const payload = {
                    ...form.data,
                    anchorDate: localDatetimeToUtcIso(form.data.anchorDate),
                };
                const response = await ofetch('/api/createRecurringIncome', {
                    method: 'POST',
                    body: payload,
                    headers: { 'Content-Type': 'application/json' },
                });
                if (response.success === false) {
                    toast.error(response.error || 'Failed to create');
                    return;
                }
                const backfilled = response.data?.backfilled ?? 0;
                const suffix =
                    backfilled > 0
                        ? form.data.generationMode === 'auto'
                            ? ` · ${backfilled} entr${backfilled === 1 ? 'y' : 'ies'} back-filled`
                            : ` · ${backfilled} pending approval${backfilled === 1 ? '' : 's'} created`
                        : '';
                toast.success(`Recurring income rule created${suffix}`);
                await goto(`/vaults/${data.vaultId}/income/recurring`);
            } catch (e: any) {
                toast.error(e?.data?.error || e?.message || 'Failed');
            }
        },
    });

    // Anchor-in-past detection drives the back-fill checkbox visibility.
    const anchorIsPast = $derived.by(() => {
        if (!$form.anchorDate) return false;
        const a = new Date($form.anchorDate);
        if (isNaN(a.getTime())) return false;
        return a.getTime() < Date.now();
    });
    const backfillAvailable = $derived(anchorIsPast);
    // Estimate how many occurrences will materialize between anchor and now.
    // Bounded by BACKFILL_CAP so the preview matches the engine's cap.
    const backfillPreviewCount = $derived.by(() => {
        if (!backfillAvailable || !$form.backfill || !$form.anchorDate) return 0;
        const anchor = new Date($form.anchorDate);
        if (isNaN(anchor.getTime())) return 0;
        const now = new Date();
        let cursor = anchor;
        let count = 0;
        while (count < BACKFILL_CAP && cursor.getTime() <= now.getTime()) {
            count++;
            const next = computeNextOccurrence(
                anchor,
                $form.scheduleUnit as ScheduleUnit,
                $form.scheduleInterval,
                cursor,
            );
            if (next.getTime() <= cursor.getTime()) break;
            cursor = next;
        }
        return count;
    });
</script>

<svelte:head>
    <title>New Recurring Income - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <header class="mb-2">
        <Eyebrow tone="muted">Plate § New recurring income</Eyebrow>
        <h1 class="dg-page-title">A new <em>recurring income</em> rule.</h1>
        <p class="dg-page-sub">Auto-generate income entries on a schedule from an existing template.</p>
    </header>
    <Rule variant="double" />
    <div class="mb-6"></div>

    {#if data.templates.length === 0}
        <Card>
            <CardContent class="py-6 text-center space-y-3">
                <p class="text-sm text-muted-foreground">You need at least one income template before creating a rule.</p>
                <Button size="sm" onclick={() => goto(`/vaults/${data.vaultId}/income/templates`)}>
                    Manage templates
                </Button>
            </CardContent>
        </Card>
    {:else}
        <Card>
            <CardHeader>
                <CardTitle>Recurring income</CardTitle>
                <CardDescription>
                    Each firing creates an income entry from the picked template — including its allowances and deductions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form method="POST" use:enhance class="space-y-6">
                    <input type="hidden" name="vaultId" bind:value={$form.vaultId} />

                    <div class="space-y-2">
                        <Label>Template <span class="text-destructive">*</span></Label>
                        <input type="hidden" name="templateId" value={$form.templateId} />
                        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {#each data.templates as tpl}
                                <button
                                    type="button"
                                    onclick={() => ($form.templateId = tpl.id)}
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

                    <div class="space-y-2">
                        <Label for="name">Rule name (optional)</Label>
                        <Input
                            id="name"
                            name="name"
                            bind:value={$form.name}
                            disabled={$delayed}
                            placeholder="Falls back to template name"
                        />
                    </div>

                    <div class="space-y-2">
                        <Label for="amountOverride">Amount override (optional)</Label>
                        <CalculatorInput
                            id="amountOverride"
                            name="amountOverride"
                            bind:value={$form.amountOverride}
                            disabled={$delayed}
                            placeholder="Use template default"
                        />
                        <p class="text-xs text-muted-foreground">
                            Replaces the template's base salary for entries generated by this rule.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div class="space-y-2">
                            <Label for="scheduleUnit">Frequency <span class="text-destructive">*</span></Label>
                            <input type="hidden" name="scheduleUnit" value={$form.scheduleUnit} />
                            <Select.Root
                                type="single"
                                value={$form.scheduleUnit}
                                onValueChange={(v: string | undefined) => ($form.scheduleUnit = (v ?? 'month') as 'day' | 'week' | 'month' | 'year')}
                            >
                                <Select.Trigger id="scheduleUnit" class="w-full" disabled={$delayed}>
                                    {FREQUENCY_LABEL[$form.scheduleUnit]}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="day" label="Daily" />
                                    <Select.Item value="week" label="Weekly" />
                                    <Select.Item value="month" label="Monthly" />
                                    <Select.Item value="year" label="Yearly" />
                                </Select.Content>
                            </Select.Root>
                        </div>
                        <div class="space-y-2">
                            <Label for="scheduleInterval">Every N</Label>
                            <Input
                                id="scheduleInterval"
                                name="scheduleInterval"
                                type="number"
                                min="1"
                                step="1"
                                bind:value={$form.scheduleInterval}
                                disabled={$delayed}
                            />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <Label for="anchorDate">First occurrence <span class="text-destructive">*</span></Label>
                        <DateTimePicker
                            id="anchorDate"
                            name="anchorDate"
                            bind:value={$form.anchorDate}
                            disabled={$delayed}
                            showTime={false}
                        />
                        {#if $errors.anchorDate}
                            <p class="text-sm text-destructive">{$errors.anchorDate}</p>
                        {/if}
                    </div>

                    <!-- Back-fill (only meaningful when anchor is in the past) -->
                    <div class="rounded-md border border-dashed bg-muted/30 p-3 space-y-2">
                        <CheckboxRow
                            name="backfill"
                            bind:checked={$form.backfill}
                            disabled={$delayed || !backfillAvailable}
                        >
                            {#snippet label()}
                                {#if $form.generationMode === 'auto'}
                                    Back-fill missed occurrences as real income entries
                                {:else}
                                    Back-fill missed occurrences as pending approvals
                                {/if}
                            {/snippet}
                            {#snippet description()}
                                {#if !backfillAvailable}
                                    <span class="text-muted-foreground">Only applies when "First occurrence" is in the past. Set an earlier date to enable.</span>
                                {:else if $form.backfill && backfillPreviewCount > 0}
                                    {#if $form.generationMode === 'auto'}
                                        <span class="font-medium text-foreground">This rule will record {backfillPreviewCount} income entr{backfillPreviewCount === 1 ? 'y' : 'ies'}</span> immediately, dated at each past occurrence (with their breakdown + linked deduction expenses).
                                    {:else}
                                        <span class="font-medium text-foreground">This rule will create {backfillPreviewCount} pending approval{backfillPreviewCount === 1 ? '' : 's'}</span> for you to confirm.
                                    {/if}
                                {:else if $form.generationMode === 'auto'}
                                    Records one income entry per missed occurrence (up to {BACKFILL_CAP}). Use this if salary/income has already been hitting your account.
                                {:else}
                                    Creates one pending approval per missed occurrence (up to {BACKFILL_CAP}).
                                {/if}
                            {/snippet}
                        </CheckboxRow>
                    </div>

                    <div class="space-y-2">
                        <Label>Generation mode <span class="text-destructive">*</span></Label>
                        <input type="hidden" name="generationMode" value={$form.generationMode} />
                        <RadioGroup.Root
                            value={$form.generationMode}
                            onValueChange={(v) => ($form.generationMode = (v ?? 'queue') as 'auto' | 'queue')}
                            disabled={$delayed}
                            class="grid grid-cols-1 gap-2 sm:grid-cols-2"
                        >
                            <RadioGroup.Item value="queue" variant="card">
                                {#snippet children()}
                                    <span class="block text-sm font-medium">Queue for approval</span>
                                    <span class="mt-0.5 block text-xs text-muted-foreground">Lands in pending approvals; you confirm each one.</span>
                                {/snippet}
                            </RadioGroup.Item>
                            <RadioGroup.Item value="auto" variant="card">
                                {#snippet children()}
                                    <span class="block text-sm font-medium">Auto-record (Pro)</span>
                                    <span class="mt-0.5 block text-xs text-muted-foreground">Income entries appear on schedule with no user action.</span>
                                {/snippet}
                            </RadioGroup.Item>
                        </RadioGroup.Root>
                    </div>

                    <div class="flex gap-3">
                        <Button type="button" variant="outline" onclick={() => goto(`/vaults/${data.vaultId}/income/recurring`)} disabled={$delayed}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={$delayed} class="flex-1">
                            {$delayed ? 'Creating…' : 'Create rule'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    {/if}
</div>

<Toaster />
