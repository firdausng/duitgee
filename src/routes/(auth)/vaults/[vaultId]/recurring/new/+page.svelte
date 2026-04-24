<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { createRecurringExpenseWithTemplateSchema } from '$lib/schemas/recurringExpenses';
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
    import { CategoryPicker } from '$lib/components/ui/category-picker';
    import { IconCombobox } from '$lib/components/ui/icon-combobox';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { categoryData } from '$lib/configurations/categories';
    import { paymentTypes } from '$lib/configurations/paymentTypes';
    import { iconData } from '$lib/configurations/icons';
    import { localDatetimeToUtcIso } from '$lib/utils';
    import { hasEntitlement } from '$lib/configurations/plans';
    import { computeNextOccurrence, computeFinalOccurrence } from '$lib/utils/recurringSchedule';
    import type { VaultWithMember } from '$lib/schemas/read/vaultWithMember';
    import { CheckboxRow } from '$lib/components/ui/checkbox-row';
    import * as Tabs from '$lib/components/ui/tabs';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';

    const BACKFILL_CAP = 12;

    let { data } = $props();

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(createRecurringExpenseWithTemplateSchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fix the highlighted fields');
                // Jump to whichever tab contains the first error so the user isn't stranded.
                if (detailsHasErrors) activeTab = 'details';
                else if (scheduleHasErrors) activeTab = 'schedule';
                return;
            }
            if (ruleType === 'installment' && (!installmentDuration || installmentDuration < 1)) {
                toast.error('Enter how many periods the installment lasts');
                activeTab = 'schedule';
                return;
            }

            try {
                const payload = {
                    ...form.data,
                    anchorDate: localDatetimeToUtcIso(form.data.anchorDate),
                    endDate: null,
                    endAfterCount: ruleType === 'installment' ? installmentDuration : null,
                    defaultFundPaymentMode: form.data.defaultFundId
                        ? form.data.defaultFundPaymentMode ?? 'paid_by_fund'
                        : null,
                };

                const response = await ofetch('/api/createRecurringExpenseWithTemplate', {
                    method: 'POST',
                    body: payload,
                    headers: { 'Content-Type': 'application/json' },
                });

                if (response.success === false) {
                    toast.error(response.error || 'Failed to create');
                    return;
                }

                const backfilled = response.data?.backfilled ?? 0;
                toast.success(
                    backfilled > 0
                        ? `Rule created · ${backfilled} back-filled item${backfilled === 1 ? '' : 's'} in pending`
                        : 'Recurring rule created',
                );
                await goto(`/vaults/${data.vaultId}/recurring`);
            } catch (error: any) {
                toast.error(error?.data?.error || error?.message || 'Failed to create rule');
            }
        },
    });

    // Vault plan → upsell hints. API still enforces.
    const vaultResource = resource(
        () => data.vaultId,
        async (vaultId) => {
            const res = await ofetch<{ success: boolean; data: VaultWithMember }>(
                `/api/getVault?vaultId=${vaultId}`,
            );
            return res.data;
        },
    );
    const planId = $derived(vaultResource.current?.vaults.planId ?? 'plan_free');
    const canCustomInterval = $derived(hasEntitlement(planId, 'recurring:custom_interval'));
    const canAutoGeneration = $derived(hasEntitlement(planId, 'recurring:auto_generation'));
    const showIntervalUpsell = $derived(!canCustomInterval && $form.scheduleInterval > 1);
    const showAutoUpsell = $derived(!canAutoGeneration && $form.generationMode === 'auto');

    let ruleType = $state<'subscription' | 'installment'>('subscription');
    let installmentDuration = $state<number | null>(12);

    // Tab state
    let activeTab = $state<'details' | 'schedule'>('details');
    const detailsHasErrors = $derived(
        !!(
            $errors.name ||
            $errors.icon ||
            $errors.defaultAmount ||
            $errors.defaultCategoryName ||
            $errors.defaultNote ||
            $errors.defaultPaymentType ||
            $errors.defaultPaidBy ||
            $errors.defaultFundId ||
            $errors.defaultFundPaymentMode
        ),
    );
    const scheduleHasErrors = $derived(
        !!(
            $errors.scheduleUnit ||
            $errors.scheduleInterval ||
            $errors.anchorDate ||
            $errors.generationMode ||
            $errors.endAfterCount ||
            $errors.endDate
        ),
    );

    // Unit label for installment duration (months, weeks, etc. — plural when N !== 1)
    const unitLabel = $derived.by(() => {
        const n = installmentDuration ?? 0;
        const base = $form.scheduleUnit;
        return n === 1 ? base : `${base}s`;
    });

    // Live Ends: preview for installments
    const installmentEndPreview = $derived.by(() => {
        if (ruleType !== 'installment') return null;
        if (!installmentDuration || installmentDuration < 1) return null;
        if (!$form.anchorDate) return null;
        const anchor = new Date($form.anchorDate);
        if (isNaN(anchor.getTime())) return null;
        const final = computeFinalOccurrence(
            anchor,
            $form.scheduleUnit,
            $form.scheduleInterval,
            installmentDuration,
        );
        return final;
    });

    function formatEndPreview(d: Date): string {
        const opts: Intl.DateTimeFormatOptions =
            $form.scheduleUnit === 'month' || $form.scheduleUnit === 'year'
                ? { month: 'short', year: 'numeric' }
                : { year: 'numeric', month: 'short', day: 'numeric' };
        return d.toLocaleDateString(undefined, opts);
    }

    // Back-fill: only meaningful when queue mode + anchor is in the past.
    const anchorIsPast = $derived.by(() => {
        if (!$form.anchorDate) return false;
        const a = new Date($form.anchorDate);
        if (isNaN(a.getTime())) return false;
        return a.getTime() < Date.now();
    });
    const backfillAvailable = $derived($form.generationMode === 'queue' && anchorIsPast);
    const backfillPreviewCount = $derived.by(() => {
        if (!backfillAvailable || !$form.backfill || !$form.anchorDate) return 0;
        const anchor = new Date($form.anchorDate);
        if (isNaN(anchor.getTime())) return 0;
        const now = new Date();
        let cursor = anchor;
        let count = 0;
        while (count < BACKFILL_CAP && cursor.getTime() <= now.getTime()) {
            count++;
            const next = computeNextOccurrence(anchor, $form.scheduleUnit, $form.scheduleInterval, cursor);
            if (next.getTime() <= cursor.getTime()) break;
            cursor = next;
        }
        return count;
    });

    function handleBack() {
        goto(`/vaults/${data.vaultId}/recurring`);
    }
</script>

<svelte:head>
    <title>New Recurring Rule - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <div class="flex items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold">New Recurring Rule</h1>
    </div>

    <Card>
        <CardHeader>
            <CardTitle>Rule Details</CardTitle>
            <CardDescription>
                Describe the expense and how often it repeats. We'll save a reusable
                template behind the scenes so you can tap it for one-off entries too.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form method="POST" use:enhance class="space-y-6">
                <input type="hidden" name="vaultId" bind:value={$form.vaultId} />

                <!-- Actions -->
                <div class="flex gap-3">
                    <Button type="button" variant="outline" onclick={handleBack} disabled={$delayed}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={$delayed} class="flex-1">
                        {$delayed ? 'Creating…' : 'Create Rule'}
                    </Button>
                </div>

                <Tabs.Root bind:value={activeTab} class="gap-4">
                    <Tabs.List class="grid w-full grid-cols-2">
                        <Tabs.Trigger value="details" class="gap-2">
                            <span>1. Details</span>
                            {#if detailsHasErrors}
                                <span class="size-2 rounded-full bg-destructive" aria-label="Has errors"></span>
                            {/if}
                        </Tabs.Trigger>
                        <Tabs.Trigger value="schedule" class="gap-2">
                            <span>2. Schedule</span>
                            {#if scheduleHasErrors}
                                <span class="size-2 rounded-full bg-destructive" aria-label="Has errors"></span>
                            {/if}
                        </Tabs.Trigger>
                    </Tabs.List>

                    <Tabs.Content value="details" class="space-y-6 mt-0">

                <!-- Name -->
                <div class="space-y-2">
                    <Label for="name">Name <span class="text-destructive">*</span></Label>
                    <Input
                        id="name"
                        name="name"
                        bind:value={$form.name}
                        disabled={$delayed}
                        placeholder="e.g., Netflix subscription, Rent"
                        class={$errors.name ? 'border-destructive' : ''}
                    />
                    {#if $errors.name}
                        <p class="text-sm text-destructive">{$errors.name}</p>
                    {/if}
                </div>

                <!-- Icon -->
                <IconCombobox
                    name="icon"
                    label="Icon"
                    icons={iconData.icons}
                    bind:value={$form.icon}
                    disabled={$delayed}
                    error={$errors.icon}
                    required={false}
                    placeholder="Search icons..."
                />

                <!-- Amount -->
                <div class="space-y-2">
                    <Label for="defaultAmount">Amount <span class="text-destructive">*</span></Label>
                    <Input
                        id="defaultAmount"
                        name="defaultAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        bind:value={$form.defaultAmount}
                        disabled={$delayed}
                        placeholder="0.00"
                        class={$errors.defaultAmount ? 'border-destructive' : ''}
                    />
                    {#if $errors.defaultAmount}
                        <p class="text-sm text-destructive">{$errors.defaultAmount}</p>
                    {/if}
                </div>

                <!-- Category -->
                <CategoryPicker
                    name="defaultCategoryName"
                    label="Category"
                    categories={categoryData.categories}
                    categoryGroups={categoryData.categoryGroups}
                    bind:value={$form.defaultCategoryName}
                    disabled={$delayed}
                    error={$errors.defaultCategoryName}
                    required={true}
                />

                <!-- Note -->
                <div class="space-y-2">
                    <Label for="defaultNote">Default note (optional)</Label>
                    <Textarea
                        id="defaultNote"
                        name="defaultNote"
                        bind:value={$form.defaultNote}
                        disabled={$delayed}
                        placeholder="Shown on generated expenses"
                        rows={2}
                    />
                </div>

                <!-- Payment type -->
                <div class="space-y-2">
                    <Label>Payment type</Label>
                    <input type="hidden" name="defaultPaymentType" value={$form.defaultPaymentType} />
                    <div class="grid grid-cols-4 gap-2">
                        {#each paymentTypes as pt}
                            <button
                                type="button"
                                onclick={() => ($form.defaultPaymentType = pt.value)}
                                disabled={$delayed}
                                class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                    {$form.defaultPaymentType === pt.value
                                        ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1'
                                        : 'border-input'}"
                                aria-label={pt.label}
                            >
                                <span class="text-xl">{pt.icon}</span>
                                <span class="text-xs leading-tight">{pt.label}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Paid by -->
                <div class="space-y-2">
                    <Label>Paid by</Label>
                    <input type="hidden" name="defaultPaidBy" value={$form.defaultPaidBy ?? ''} />
                    <div class="grid grid-cols-3 gap-1">
                        <button
                            type="button"
                            onclick={() => ($form.defaultPaidBy = '')}
                            disabled={$delayed}
                            class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                {!$form.defaultPaidBy ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                        >
                            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-base">—</span>
                            <span class="leading-tight">Vault-level</span>
                        </button>
                        <button
                            type="button"
                            onclick={() => ($form.defaultPaidBy = '__creator__')}
                            disabled={$delayed}
                            class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                {$form.defaultPaidBy === '__creator__' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                        >
                            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">★</span>
                            <span class="leading-tight">Creator</span>
                        </button>
                        {#each data.members as member}
                            <button
                                type="button"
                                onclick={() => ($form.defaultPaidBy = member.userId)}
                                disabled={$delayed}
                                class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                    {$form.defaultPaidBy === member.userId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                            >
                                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                    {member.displayName.charAt(0).toUpperCase()}
                                </span>
                                <span class="leading-tight line-clamp-2">{member.displayName}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Fund -->
                {#if data.funds.length > 0}
                    <div class="space-y-2">
                        <Label>Fund (optional)</Label>
                        <input type="hidden" name="defaultFundId" value={$form.defaultFundId ?? ''} />
                        <div class="grid grid-cols-3 gap-1">
                            <button
                                type="button"
                                onclick={() => ($form.defaultFundId = null)}
                                disabled={$delayed}
                                class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                    {!$form.defaultFundId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                            >
                                <span class="text-xl">—</span>
                                <span class="leading-tight">No fund</span>
                            </button>
                            {#each data.funds as fund}
                                <button
                                    type="button"
                                    onclick={() => ($form.defaultFundId = fund.id)}
                                    disabled={$delayed}
                                    class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                        {$form.defaultFundId === fund.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                                >
                                    <span class="text-xl">{fund.icon ?? '💰'}</span>
                                    <span class="leading-tight line-clamp-2">{fund.name}</span>
                                </button>
                            {/each}
                        </div>
                    </div>

                    {#if $form.defaultFundId}
                        <div class="space-y-2">
                            <Label>Fund payment mode</Label>
                            <input type="hidden" name="defaultFundPaymentMode" value={$form.defaultFundPaymentMode ?? 'paid_by_fund'} />
                            <div class="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onclick={() => ($form.defaultFundPaymentMode = 'paid_by_fund')}
                                    disabled={$delayed}
                                    class="rounded-md border-2 px-3 py-2.5 text-sm text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                        {$form.defaultFundPaymentMode === 'paid_by_fund' ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}"
                                >
                                    Paid by fund
                                </button>
                                <button
                                    type="button"
                                    onclick={() => ($form.defaultFundPaymentMode = 'pending_reimbursement')}
                                    disabled={$delayed}
                                    class="rounded-md border-2 px-3 py-2.5 text-sm text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                        {$form.defaultFundPaymentMode === 'pending_reimbursement' ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}"
                                >
                                    Pending reimb.
                                </button>
                            </div>
                        </div>
                    {/if}
                {/if}

                        <div class="flex justify-end pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onclick={() => (activeTab = 'schedule')}
                                disabled={$delayed}
                            >
                                Next: Schedule
                                <ArrowRight class="size-3.5" />
                            </Button>
                        </div>
                    </Tabs.Content>

                    <Tabs.Content value="schedule" class="space-y-6 mt-0">
                        <p class="text-xs text-muted-foreground">
                            How often and when this rule fires.
                        </p>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div class="space-y-2">
                            <Label for="scheduleUnit">Frequency <span class="text-destructive">*</span></Label>
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
                            <Label for="scheduleInterval">
                                Every N
                                {#if !canCustomInterval}
                                    <span class="text-[10px] uppercase tracking-wide rounded-full bg-secondary text-secondary-foreground px-1.5 py-0.5 ml-1">Pro</span>
                                {/if}
                            </Label>
                            <Input
                                id="scheduleInterval"
                                name="scheduleInterval"
                                type="number"
                                min="1"
                                step="1"
                                bind:value={$form.scheduleInterval}
                                disabled={$delayed}
                            />
                            <p class="text-xs text-muted-foreground">
                                {#if $form.scheduleInterval === 1}
                                    1 = every {$form.scheduleUnit}
                                {:else}
                                    Fires every {$form.scheduleInterval} {$form.scheduleUnit}s
                                {/if}
                            </p>
                            {#if showIntervalUpsell}
                                <p class="text-xs text-amber-600 dark:text-amber-400">
                                    Custom intervals require Pro. Keep it at 1 or upgrade.
                                </p>
                            {/if}
                        </div>
                    </div>

                    <div class="space-y-2">
                        <Label for="anchorDate">First occurrence <span class="text-destructive">*</span></Label>
                        <Input
                            id="anchorDate"
                            name="anchorDate"
                            type="datetime-local"
                            bind:value={$form.anchorDate}
                            disabled={$delayed}
                        />
                        {#if $errors.anchorDate}
                            <p class="text-sm text-destructive">{$errors.anchorDate}</p>
                        {/if}
                        <p class="text-xs text-muted-foreground">
                            Sets the day-of-week (for weekly) or day-of-month (for monthly/yearly).
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Label>Generation mode <span class="text-destructive">*</span></Label>
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
                                    <p class="text-xs text-muted-foreground">
                                        Lands in "Pending approvals" for review.
                                    </p>
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
                                    <p class="text-xs text-muted-foreground">
                                        Auto-records the expense on schedule.
                                    </p>
                                </div>
                            </label>
                        </div>
                        {#if showAutoUpsell}
                            <p class="text-xs text-amber-600 dark:text-amber-400">
                                Auto-create requires Pro. Switch to "Queue for approval" or upgrade.
                            </p>
                        {/if}
                    </div>

                    {#if backfillAvailable}
                        <div class="rounded-md border border-dashed bg-muted/30 p-3">
                            <CheckboxRow
                                name="backfill"
                                bind:checked={$form.backfill}
                                disabled={$delayed}
                            >
                                {#snippet label()}
                                    Back-fill past occurrences as pending approvals
                                {/snippet}
                                {#snippet description()}
                                    Walks from the anchor date forward and creates one pending
                                    item per missed occurrence (up to {BACKFILL_CAP}).
                                    {#if $form.backfill && backfillPreviewCount > 0}
                                        <span class="font-medium text-foreground"> — this rule will create {backfillPreviewCount} pending item{backfillPreviewCount === 1 ? '' : 's'}.</span>
                                    {/if}
                                {/snippet}
                            </CheckboxRow>
                        </div>
                    {/if}

                    <div class="space-y-2">
                        <Label>Rule type <span class="text-destructive">*</span></Label>
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
                                    <p class="text-xs text-muted-foreground">
                                        Ongoing — like a phone bill or Netflix.
                                    </p>
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
                                    <p class="text-xs text-muted-foreground">
                                        Finite — like a 12-month credit card plan.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {#if ruleType === 'installment'}
                        <div class="rounded-md border border-dashed bg-muted/30 p-3 space-y-2">
                            <Label for="installmentDuration">Duration <span class="text-destructive">*</span></Label>
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
                                    {#if $form.defaultAmount && installmentDuration}
                                        <span class="opacity-60">·</span>
                                        Total: <span class="font-mono">{($form.defaultAmount * installmentDuration).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    {/if}
                                </p>
                            {/if}
                        </div>
                    {/if}
                    </Tabs.Content>
                </Tabs.Root>

                <div class="sm:hidden pb-24"></div>
            </form>
        </CardContent>
    </Card>
</div>

<Toaster />
