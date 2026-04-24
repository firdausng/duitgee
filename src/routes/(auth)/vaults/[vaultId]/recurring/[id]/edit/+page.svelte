<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { updateRecurringExpenseWithTemplateSchema } from '$lib/schemas/recurringExpenses';
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { CategoryPicker } from '$lib/components/ui/category-picker';
    import { IconCombobox } from '$lib/components/ui/icon-combobox';
    import { DateTimePicker } from '$lib/components/ui/date-time-picker';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { categoryData } from '$lib/configurations/categories';
    import { paymentTypes } from '$lib/configurations/paymentTypes';
    import { iconData } from '$lib/configurations/icons';
    import { localDatetimeToUtcIso } from '$lib/utils';
    import { hasEntitlement } from '$lib/configurations/plans';
    import { computeFinalOccurrence } from '$lib/utils/recurringSchedule';
    import type { VaultWithMember } from '$lib/schemas/read/vaultWithMember';
    import * as Tabs from '$lib/components/ui/tabs';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';

    let { data } = $props();

    // Save dialog state — only engaged when the rule has generated expenses
    let saveDialogOpen = $state(false);
    let pendingFormData = $state<typeof data.form.data | null>(null);
    let saving = $state(false);

    async function submitPayload(formData: typeof data.form.data, applyToPast: boolean) {
        saving = true;
        try {
            const payload = {
                ...formData,
                anchorDate: localDatetimeToUtcIso(formData.anchorDate),
                endDate: null,
                endAfterCount: ruleType === 'installment' ? installmentDuration : null,
                defaultFundPaymentMode: formData.defaultFundId
                    ? formData.defaultFundPaymentMode ?? 'paid_by_fund'
                    : null,
                applyToPast,
            };

            const response = await ofetch('/api/updateRecurringExpenseWithTemplate', {
                method: 'POST',
                body: payload,
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.success === false) {
                toast.error(response.error || 'Failed to save');
                return;
            }

            const applied = response.data?.appliedToPast ?? 0;
            toast.success(
                applyToPast && applied > 0
                    ? `Rule updated · ${applied} past expense${applied === 1 ? '' : 's'} updated`
                    : 'Rule updated',
            );
            await goto(`/vaults/${data.vaultId}/recurring`);
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to save');
        } finally {
            saving = false;
        }
    }

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(updateRecurringExpenseWithTemplateSchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fix the highlighted fields');
                if (detailsHasErrors) activeTab = 'details';
                else if (scheduleHasErrors) activeTab = 'schedule';
                return;
            }
            if (ruleType === 'installment' && (!installmentDuration || installmentDuration < 1)) {
                toast.error('Enter how many periods the installment lasts');
                activeTab = 'schedule';
                return;
            }

            // If this rule has generated expenses, gate through the dialog.
            const paidCount = data.rule?.progress?.paidCount ?? 0;
            if (paidCount > 0) {
                pendingFormData = form.data;
                saveDialogOpen = true;
                return;
            }

            await submitPayload(form.data, false);
        },
    });

    function cancelSaveDialog() {
        if (saving) return;
        saveDialogOpen = false;
        pendingFormData = null;
    }

    async function confirmSaveFutureOnly() {
        if (!pendingFormData) return;
        const d = pendingFormData;
        saveDialogOpen = false;
        await submitPayload(d, false);
        pendingFormData = null;
    }

    async function confirmSaveApplyToPast() {
        if (!pendingFormData) return;
        const d = pendingFormData;
        saveDialogOpen = false;
        await submitPayload(d, true);
        pendingFormData = null;
    }

    // Plan upsell hints (API still enforces)
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

    // Rule type derived from the loaded rule
    let ruleType = $state<'subscription' | 'installment'>(
        data.rule?.endAfterCount ? 'installment' : 'subscription',
    );
    let installmentDuration = $state<number | null>(data.rule?.endAfterCount ?? 12);

    const unitLabel = $derived.by(() => {
        const n = installmentDuration ?? 0;
        const base = $form.scheduleUnit;
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
            $form.scheduleUnit,
            $form.scheduleInterval,
            installmentDuration,
        );
    });

    function formatEndPreview(d: Date): string {
        const opts: Intl.DateTimeFormatOptions =
            $form.scheduleUnit === 'month' || $form.scheduleUnit === 'year'
                ? { month: 'short', year: 'numeric' }
                : { year: 'numeric', month: 'short', day: 'numeric' };
        return d.toLocaleDateString(undefined, opts);
    }

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
                                            Custom intervals require Pro.
                                        </p>
                                    {/if}
                                </div>
                            </div>

                            <div class="space-y-2">
                                <Label for="anchorDate">First occurrence <span class="text-destructive">*</span></Label>
                                <DateTimePicker
                                    id="anchorDate"
                                    name="anchorDate"
                                    bind:value={$form.anchorDate}
                                    disabled={$delayed}
                                />
                                {#if $errors.anchorDate}
                                    <p class="text-sm text-destructive">{$errors.anchorDate}</p>
                                {/if}
                                <p class="text-xs text-muted-foreground">
                                    Changing the schedule recomputes the next occurrence from now — no back-fill.
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
                                        Auto-create requires Pro.
                                    </p>
                                {/if}
                            </div>

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
                        </Tabs.Content>
                    </Tabs.Root>

                    <div class="sm:hidden pb-24"></div>
                </form>
            </CardContent>
        </Card>
    {/if}
</div>

{#if saveDialogOpen && data.rule}
    {@const paidCount = data.rule.progress.paidCount}
    {@const paidAmount = data.rule.progress.paidAmount}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
    >
        <button
            type="button"
            class="fixed inset-0 bg-black/50"
            onclick={cancelSaveDialog}
            aria-label="Close"
        ></button>
        <div class="relative z-10 w-full max-w-md rounded-[var(--radius-md)] border bg-card shadow-lg">
            <div class="p-5 space-y-3">
                <h3 class="text-base font-semibold">Save changes?</h3>
                <div class="text-sm text-muted-foreground space-y-2">
                    <p>
                        This rule has already generated
                        <span class="font-medium text-foreground">{paidCount} expense{paidCount === 1 ? '' : 's'}</span>
                        {#if paidAmount > 0}
                            totaling {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        {/if}.
                    </p>
                    <p>
                        Apply your edits to those past rows too? Amount, category, note, payment type,
                        paid-by, and fund will be propagated. Schedule changes never apply retroactively.
                    </p>
                </div>
            </div>
            <div class="border-t p-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" size="sm" onclick={cancelSaveDialog} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onclick={confirmSaveFutureOnly}
                    disabled={saving}
                >
                    Save (future only)
                </Button>
                <Button size="sm" onclick={confirmSaveApplyToPast} disabled={saving}>
                    Save + update {paidCount} past
                </Button>
            </div>
        </div>
    </div>
{/if}

<Toaster />
