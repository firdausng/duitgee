<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { updateRecurringIncomeSchema } from '$lib/schemas/recurringIncome';
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { CalculatorInput } from '$lib/components/ui/calculator-input';
    import { DateTimePicker } from '$lib/components/ui/date-time-picker';
    import * as Select from '$lib/components/ui/select';
    import * as RadioGroup from '$lib/components/ui/radio-group';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { localDatetimeToUtcIso } from '$lib/utils';

    const FREQUENCY_LABEL: Record<'day' | 'week' | 'month' | 'year', string> = {
        day: 'Daily',
        week: 'Weekly',
        month: 'Monthly',
        year: 'Yearly',
    };

    let { data } = $props();

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(updateRecurringIncomeSchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fix the highlighted fields');
                return;
            }
            try {
                const payload = {
                    ...form.data,
                    anchorDate: form.data.anchorDate ? localDatetimeToUtcIso(form.data.anchorDate) : undefined,
                };
                const response = await ofetch('/api/updateRecurringIncome', {
                    method: 'POST',
                    body: payload,
                    headers: { 'Content-Type': 'application/json' },
                });
                if (response.success === false) {
                    toast.error(response.error || 'Failed');
                    return;
                }
                toast.success('Rule updated');
                await goto(`/vaults/${data.vaultId}/income/recurring`);
            } catch (e: any) {
                toast.error(e?.data?.error || e?.message || 'Failed');
            }
        },
    });
</script>

<svelte:head>
    <title>Edit Recurring Income - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <header class="mb-2">
        <Eyebrow tone="muted">Plate § Edit rule</Eyebrow>
        <h1 class="dg-page-title">Edit <em>recurring income</em>.</h1>
        <p class="dg-page-sub">Template: {data.rule.template.name ?? '—'}</p>
    </header>
    <Rule variant="double" />
    <div class="mb-6"></div>

    <Card>
        <CardHeader>
            <CardTitle>Rule</CardTitle>
        </CardHeader>
        <CardContent>
            <form method="POST" use:enhance class="space-y-6">
                <input type="hidden" name="id" bind:value={$form.id} />
                <input type="hidden" name="vaultId" bind:value={$form.vaultId} />

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
                </div>

                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div class="space-y-2">
                        <Label for="scheduleUnit">Frequency</Label>
                        <input type="hidden" name="scheduleUnit" value={$form.scheduleUnit} />
                        <Select.Root
                            type="single"
                            value={$form.scheduleUnit}
                            onValueChange={(v: string | undefined) => ($form.scheduleUnit = (v ?? 'month') as 'day' | 'week' | 'month' | 'year')}
                        >
                            <Select.Trigger id="scheduleUnit" class="w-full" disabled={$delayed}>
                                {FREQUENCY_LABEL[$form.scheduleUnit ?? 'month']}
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
                    <Label for="anchorDate">First occurrence</Label>
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
                    <p class="text-xs text-muted-foreground">
                        Changing the schedule recomputes the next occurrence from now — no back-fill.
                    </p>
                </div>

                <div class="space-y-2">
                    <Label>Generation mode</Label>
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
                                <span class="mt-0.5 block text-xs text-muted-foreground">Lands in pending approvals.</span>
                            {/snippet}
                        </RadioGroup.Item>
                        <RadioGroup.Item value="auto" variant="card">
                            {#snippet children()}
                                <span class="block text-sm font-medium">Auto-record (Pro)</span>
                                <span class="mt-0.5 block text-xs text-muted-foreground">No user action needed.</span>
                            {/snippet}
                        </RadioGroup.Item>
                    </RadioGroup.Root>
                </div>

                <div class="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onclick={() => goto(`/vaults/${data.vaultId}/income/recurring`)} disabled={$delayed}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={$delayed} class="flex-1">
                        {$delayed ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </form>
        </CardContent>
    </Card>
</div>

<Toaster />
