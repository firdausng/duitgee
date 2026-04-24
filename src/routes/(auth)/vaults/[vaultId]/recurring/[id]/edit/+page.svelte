<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { updateRecurringExpenseSchema } from '$lib/schemas/recurringExpenses';
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { localDatetimeToUtcIso } from '$lib/utils';
    import { computeFinalOccurrence } from '$lib/utils/recurringSchedule';

    let { data } = $props();

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(updateRecurringExpenseSchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fix the highlighted fields');
                return;
            }
            if (ruleType === 'installment' && (!installmentDuration || installmentDuration < 1)) {
                toast.error('Enter how many periods the installment lasts');
                return;
            }

            try {
                const payload = {
                    ...form.data,
                    anchorDate: form.data.anchorDate ? localDatetimeToUtcIso(form.data.anchorDate) : undefined,
                    endDate: null,
                    endAfterCount: ruleType === 'installment' ? installmentDuration : null,
                };

                const response = await ofetch('/api/updateRecurringExpense', {
                    method: 'POST',
                    body: payload,
                    headers: { 'Content-Type': 'application/json' },
                });

                if (response.success === false) {
                    toast.error(response.error || 'Failed to save');
                    return;
                }

                toast.success('Rule updated');
                await goto(`/vaults/${data.vaultId}/recurring`);
            } catch (error: any) {
                toast.error(error?.data?.error || error?.message || 'Failed to save');
            }
        },
    });

    // Initialize rule type from loaded data: endAfterCount → installment, else subscription.
    let ruleType = $state<'subscription' | 'installment'>(
        data.rule?.endAfterCount ? 'installment' : 'subscription',
    );
    let installmentDuration = $state<number | null>(data.rule?.endAfterCount ?? 12);

    const unitLabel = $derived.by(() => {
        const n = installmentDuration ?? 0;
        const base = $form.scheduleUnit ?? 'month';
        return n === 1 ? base : `${base}s`;
    });

    const installmentEndPreview = $derived.by(() => {
        if (ruleType !== 'installment') return null;
        if (!installmentDuration || installmentDuration < 1) return null;
        if (!$form.anchorDate) return null;
        const anchor = new Date($form.anchorDate);
        if (isNaN(anchor.getTime())) return null;
        return computeFinalOccurrence(
            anchor,
            $form.scheduleUnit ?? 'month',
            $form.scheduleInterval ?? 1,
            installmentDuration,
        );
    });

    function formatEndPreview(d: Date): string {
        const unit = $form.scheduleUnit ?? 'month';
        const opts: Intl.DateTimeFormatOptions =
            unit === 'month' || unit === 'year'
                ? { month: 'short', year: 'numeric' }
                : { year: 'numeric', month: 'short', day: 'numeric' };
        return d.toLocaleDateString(undefined, opts);
    }

    function handleBack() {
        goto(`/vaults/${data.vaultId}/recurring`);
    }
</script>

<svelte:head>
    <title>Edit Recurring Rule - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <div class="flex items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold">Edit Recurring Rule</h1>
    </div>

    {#if !data.rule}
        <Card>
            <CardContent class="py-10 text-center">
                <p class="text-sm text-muted-foreground mb-4">Rule not found.</p>
                <Button variant="outline" onclick={handleBack}>Back</Button>
            </CardContent>
        </Card>
    {:else}
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <span>{data.rule.template.icon ?? '🔁'}</span>
                    <span>{data.rule.name || data.rule.template.name || 'Rule'}</span>
                    {#if data.rule.status !== 'active'}
                        <span class="text-xs uppercase tracking-wide rounded-full bg-muted text-muted-foreground px-2 py-0.5">
                            {data.rule.status}
                        </span>
                    {/if}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form method="POST" use:enhance class="space-y-6">
                    <input type="hidden" name="id" bind:value={$form.id} />
                    <input type="hidden" name="vaultId" bind:value={$form.vaultId} />

                    <div class="flex gap-3">
                        <Button type="button" variant="outline" onclick={handleBack} disabled={$delayed}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={$delayed} class="flex-1">
                            {$delayed ? 'Saving…' : 'Save'}
                        </Button>
                    </div>

                    <!-- Display name -->
                    <div class="space-y-2">
                        <Label for="name">Display name</Label>
                        <Input
                            id="name"
                            name="name"
                            bind:value={$form.name}
                            disabled={$delayed}
                            placeholder={data.rule.template.name || 'e.g., Netflix subscription'}
                        />
                    </div>

                    <!-- Amount override -->
                    <div class="space-y-2">
                        <Label for="amountOverride">Amount override</Label>
                        <Input
                            id="amountOverride"
                            name="amountOverride"
                            type="number"
                            step="0.01"
                            min="0"
                            bind:value={$form.amountOverride}
                            disabled={$delayed}
                            placeholder={data.rule.template.defaultAmount != null ? String(data.rule.template.defaultAmount) : ''}
                        />
                        <p class="text-xs text-muted-foreground">Leave blank to use the template's default.</p>
                    </div>

                    <!-- Schedule -->
                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div class="space-y-2">
                            <Label for="scheduleUnit">Schedule</Label>
                            <select
                                id="scheduleUnit"
                                name="scheduleUnit"
                                bind:value={$form.scheduleUnit}
                                disabled={$delayed}
                                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="day">Daily</option>
                                <option value="week">Weekly</option>
                                <option value="month">Monthly</option>
                                <option value="year">Yearly</option>
                            </select>
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
                        <Label for="anchorDate">Anchor date</Label>
                        <Input
                            id="anchorDate"
                            name="anchorDate"
                            type="datetime-local"
                            bind:value={$form.anchorDate}
                            disabled={$delayed}
                        />
                        <p class="text-xs text-muted-foreground">
                            Changing the schedule recomputes the next occurrence from now — no back-fill.
                        </p>
                    </div>

                    <!-- Generation mode -->
                    <div class="space-y-2">
                        <Label>Generation mode</Label>
                        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label
                                class="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                                class:ring-2={$form.generationMode === 'queue'}
                                class:ring-primary={$form.generationMode === 'queue'}
                            >
                                <input
                                    type="radio"
                                    name="generationMode"
                                    value="queue"
                                    bind:group={$form.generationMode}
                                    disabled={$delayed}
                                    class="mt-0.5"
                                />
                                <div>
                                    <p class="text-sm font-medium">Queue for approval</p>
                                </div>
                            </label>
                            <label
                                class="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                                class:ring-2={$form.generationMode === 'auto'}
                                class:ring-primary={$form.generationMode === 'auto'}
                            >
                                <input
                                    type="radio"
                                    name="generationMode"
                                    value="auto"
                                    bind:group={$form.generationMode}
                                    disabled={$delayed}
                                    class="mt-0.5"
                                />
                                <div>
                                    <p class="text-sm font-medium">
                                        Auto-create
                                        <span class="text-[10px] uppercase tracking-wide rounded-full bg-secondary text-secondary-foreground px-1.5 py-0.5 ml-1">Pro</span>
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Rule type -->
                    <div class="space-y-2">
                        <Label>Rule type</Label>
                        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label
                                class="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                                class:ring-2={ruleType === 'subscription'}
                                class:ring-primary={ruleType === 'subscription'}
                            >
                                <input
                                    type="radio"
                                    bind:group={ruleType}
                                    value="subscription"
                                    disabled={$delayed}
                                    class="mt-0.5"
                                />
                                <div>
                                    <p class="text-sm font-medium">Subscription</p>
                                    <p class="text-xs text-muted-foreground">Ongoing, no end.</p>
                                </div>
                            </label>
                            <label
                                class="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                                class:ring-2={ruleType === 'installment'}
                                class:ring-primary={ruleType === 'installment'}
                            >
                                <input
                                    type="radio"
                                    bind:group={ruleType}
                                    value="installment"
                                    disabled={$delayed}
                                    class="mt-0.5"
                                />
                                <div>
                                    <p class="text-sm font-medium">Installment</p>
                                    <p class="text-xs text-muted-foreground">Finite — set a duration.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {#if ruleType === 'installment'}
                        <div class="rounded-md border border-dashed bg-muted/30 p-3 space-y-2">
                            <Label for="installmentDuration">Duration</Label>
                            <div class="flex items-center gap-2">
                                <Input
                                    id="installmentDuration"
                                    type="number"
                                    min="1"
                                    step="1"
                                    bind:value={installmentDuration}
                                    disabled={$delayed}
                                    class="max-w-[120px]"
                                />
                                <span class="text-sm text-muted-foreground">{unitLabel}</span>
                            </div>
                            {#if installmentEndPreview}
                                <p class="text-xs text-muted-foreground">
                                    Ends: <span class="font-medium text-foreground">{formatEndPreview(installmentEndPreview)}</span>
                                </p>
                            {/if}
                        </div>
                    {/if}

                    <div class="sm:hidden pb-24"></div>
                </form>
            </CardContent>
        </Card>
    {/if}
</div>

<Toaster />
