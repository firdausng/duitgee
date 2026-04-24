<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { parseISO } from 'date-fns';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { EmptyState } from '$lib/components/ui/empty-state';
    import { Amount } from '$lib/components/ui/amount';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { createVaultFormatters } from '$lib/vaultFormatting';
    import type { VaultWithMember } from '$lib/schemas/read/vaultWithMember';
    import Plus from '@lucide/svelte/icons/plus';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Copy from '@lucide/svelte/icons/copy';
    import * as Select from '$lib/components/ui/select';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import MoreVertical from '@lucide/svelte/icons/more-vertical';
    import CircleCheck from '@lucide/svelte/icons/circle-check';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { DateTimePicker } from '$lib/components/ui/date-time-picker';
    import { formatDatetimeLocal, localDatetimeToUtcIso } from '$lib/utils';
    import Play from '@lucide/svelte/icons/play';
    import Pause from '@lucide/svelte/icons/pause';
    import SkipForward from '@lucide/svelte/icons/skip-forward';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';
    import Check from '@lucide/svelte/icons/check';
    import X from '@lucide/svelte/icons/x';
    import type { UpcomingOccurrence } from '$lib/server/api/recurring-expenses/getUpcomingOccurrencesHandler';

    const vaultId = $derived(page.params.vaultId);

    type Rule = {
        id: string;
        vaultId: string;
        templateId: string;
        name: string | null;
        amountOverride: number | null;
        scheduleUnit: 'day' | 'week' | 'month' | 'year';
        scheduleInterval: number;
        anchorDate: string;
        generationMode: 'auto' | 'queue';
        status: 'active' | 'paused' | 'ended';
        endDate: string | null;
        endAfterCount: number | null;
        nextOccurrenceAt: string | null;
        occurrenceCount: number;
        template: {
            name: string | null;
            icon: string | null;
            defaultAmount: number | null;
            defaultCategoryName: string | null;
        };
        progress: {
            paidCount: number;
            paidAmount: number;
            pendingCount: number;
            totalAmount: number | null;
            finalOccurrenceAt: string | null;
        };
    };

    type PendingOccurrence = {
        id: string;
        recurringExpenseId: string;
        dueDate: string;
        suggestedAmount: number;
        ruleName: string | null;
        ruleEndAfterCount: number | null;
        templateName: string | null;
        templateIcon: string | null;
        templateCategory: string | null;
    };

    let refetchKey = $state(0);

    const vaultResource = resource(
        () => vaultId,
        async (id) => {
            const res = await ofetch<{ success: boolean; data: VaultWithMember }>(`/api/getVault?vaultId=${id}`);
            return res.data;
        },
    );

    const fmt = $derived(
        vaultResource.current
            ? createVaultFormatters({
                  locale: vaultResource.current.vaults.locale || 'en-US',
                  currency: vaultResource.current.vaults.currency || 'USD',
              })
            : createVaultFormatters({ locale: 'en-US', currency: 'USD' }),
    );

    const rulesResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const res = await ofetch<{ success: boolean; data: Rule[] }>(
                `/api/getRecurringExpenses?vaultId=${id}`,
            );
            return res.data ?? [];
        },
    );

    const pendingResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const res = await ofetch<{ success: boolean; data: PendingOccurrence[] }>(
                `/api/getPendingOccurrences?vaultId=${id}`,
            );
            return res.data ?? [];
        },
    );

    const upcomingResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const res = await ofetch<{ success: boolean; data: UpcomingOccurrence[] }>(
                `/api/getUpcomingOccurrences?vaultId=${id}&days=7`,
            );
            return res.data ?? [];
        },
    );

    const rules = $derived(rulesResource.current ?? []);
    const pending = $derived(pendingResource.current ?? []);
    const upcoming = $derived(upcomingResource.current ?? []);
    const isLoading = $derived(
        rulesResource.loading || pendingResource.loading || upcomingResource.loading,
    );

    function scheduleLabel(rule: Rule): string {
        const { scheduleUnit, scheduleInterval, anchorDate } = rule;
        const unitMap = { day: 'day', week: 'week', month: 'month', year: 'year' } as const;
        const unitPlural = (n: number, u: string) => (n === 1 ? u : `${u}s`);
        if (scheduleInterval === 1) {
            if (scheduleUnit === 'day') return 'Daily';
            if (scheduleUnit === 'week') {
                const dow = parseISO(anchorDate).toLocaleDateString(fmt.getLocale(), { weekday: 'long' });
                return `Weekly on ${dow}`;
            }
            if (scheduleUnit === 'month') {
                const dom = parseISO(anchorDate).getDate();
                return `Monthly on the ${dom}${ordinal(dom)}`;
            }
            if (scheduleUnit === 'year') {
                const d = parseISO(anchorDate);
                return `Yearly on ${d.toLocaleDateString(fmt.getLocale(), { month: 'short', day: 'numeric' })}`;
            }
        }
        return `Every ${scheduleInterval} ${unitPlural(scheduleInterval, unitMap[scheduleUnit])}`;
    }

    function ordinal(n: number): string {
        const mod100 = n % 100;
        if (mod100 >= 11 && mod100 <= 13) return 'th';
        switch (n % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }

    function ruleAmount(rule: Rule): number {
        return rule.amountOverride ?? rule.template.defaultAmount ?? 0;
    }

    async function handleApprove(occ: PendingOccurrence) {
        try {
            await ofetch('/api/approvePendingOccurrence', {
                method: 'POST',
                body: { vaultId, occurrenceId: occ.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Expense created');
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to approve');
        }
    }

    async function handleSkipPending(occ: PendingOccurrence) {
        try {
            await ofetch('/api/skipPendingOccurrence', {
                method: 'POST',
                body: { vaultId, occurrenceId: occ.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Skipped');
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to skip');
        }
    }

    async function handlePauseRule(rule: Rule) {
        try {
            await ofetch('/api/pauseRecurringExpense', {
                method: 'POST',
                body: { vaultId, id: rule.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Rule paused');
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to pause');
        }
    }

    async function handleResumeRule(rule: Rule) {
        try {
            await ofetch('/api/resumeRecurringExpense', {
                method: 'POST',
                body: { vaultId, id: rule.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Rule resumed');
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to resume');
        }
    }

    // Generic confirm dialog state for Skip / Pause (Delete has its own cascade dialog).
    type ConfirmAction = { type: 'skip' | 'pause'; rule: Rule };
    let confirmAction = $state<ConfirmAction | null>(null);
    let confirming = $state(false);

    // Settlement dialog state
    let settleTarget = $state<Rule | null>(null);
    let settleAmount = $state<number>(0);
    let settleDate = $state<string>('');
    let settling = $state(false);

    function askSettle(rule: Rule) {
        const remaining = (rule.endAfterCount ?? 0) - rule.progress.paidCount;
        const perPeriod = ruleAmount(rule);
        settleAmount = Math.max(0.01, remaining * perPeriod);
        settleDate = formatDatetimeLocal(new Date());
        settleTarget = rule;
    }

    function cancelSettle() {
        if (settling) return;
        settleTarget = null;
    }

    async function confirmSettle() {
        if (!settleTarget) return;
        if (!settleAmount || settleAmount <= 0) {
            toast.error('Enter a settlement amount');
            return;
        }
        if (!settleDate) {
            toast.error('Pick a date');
            return;
        }
        settling = true;
        try {
            await ofetch('/api/settleRecurringExpense', {
                method: 'POST',
                body: {
                    vaultId,
                    id: settleTarget.id,
                    amount: settleAmount,
                    date: localDatetimeToUtcIso(settleDate),
                },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Settled in full');
            settleTarget = null;
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to settle');
        } finally {
            settling = false;
        }
    }

    function askSkipNext(rule: Rule) {
        confirmAction = { type: 'skip', rule };
    }

    function askPauseRule(rule: Rule) {
        confirmAction = { type: 'pause', rule };
    }

    function cancelConfirm() {
        if (confirming) return;
        confirmAction = null;
    }

    async function executeConfirm() {
        if (!confirmAction) return;
        confirming = true;
        try {
            if (confirmAction.type === 'skip') {
                await ofetch('/api/skipNextOccurrence', {
                    method: 'POST',
                    body: { vaultId, id: confirmAction.rule.id },
                    headers: { 'Content-Type': 'application/json' },
                });
                toast.success('Next occurrence skipped');
            } else {
                await ofetch('/api/pauseRecurringExpense', {
                    method: 'POST',
                    body: { vaultId, id: confirmAction.rule.id },
                    headers: { 'Content-Type': 'application/json' },
                });
                toast.success('Rule paused');
            }
            confirmAction = null;
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed');
        } finally {
            confirming = false;
        }
    }

    async function handleSkipNext(rule: Rule) {
        try {
            await ofetch('/api/skipNextOccurrence', {
                method: 'POST',
                body: { vaultId, id: rule.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Next occurrence skipped');
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to skip');
        }
    }

    let deleteTarget = $state<Rule | null>(null);
    let deleting = $state(false);

    function handleDeleteRule(rule: Rule) {
        deleteTarget = rule;
    }

    function cancelDelete() {
        if (deleting) return;
        deleteTarget = null;
    }

    async function confirmDelete(deleteExpenses: boolean) {
        if (!deleteTarget) return;
        deleting = true;
        try {
            const response = await ofetch('/api/deleteRecurringExpense', {
                method: 'POST',
                body: { vaultId, id: deleteTarget.id, deleteExpenses },
                headers: { 'Content-Type': 'application/json' },
            });
            const n = response?.data?.expensesDeleted ?? 0;
            toast.success(
                deleteExpenses && n > 0
                    ? `Rule deleted · ${n} expense${n === 1 ? '' : 's'} removed`
                    : 'Rule deleted',
            );
            deleteTarget = null;
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to delete');
        } finally {
            deleting = false;
        }
    }

    function displayName(rule: Rule): string {
        return rule.name || rule.template.name || 'Recurring rule';
    }

    // ── Installment / subscription partitioning ─────────────────────────
    const installmentRules = $derived(rules.filter((r) => r.endAfterCount !== null));
    const subscriptionRules = $derived(rules.filter((r) => r.endAfterCount === null));

    const activeInstallments = $derived(installmentRules.filter((r) => r.status !== 'ended'));
    const completedInstallments = $derived(installmentRules.filter((r) => r.status === 'ended'));

    const installmentSummary = $derived.by(() => {
        const active = activeInstallments.length;
        const monthlyCommit = activeInstallments.reduce((sum, r) => sum + ruleAmount(r), 0);
        const paidAmount = installmentRules.reduce((sum, r) => sum + r.progress.paidAmount, 0);
        const totalAmount = installmentRules.reduce(
            (sum, r) => sum + (r.progress.totalAmount ?? 0),
            0,
        );
        const pct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
        return { active, monthlyCommit, paidAmount, totalAmount, pct };
    });

    type SortMode =
        | 'almost-finished'
        | 'end-date-desc'
        | 'amount-desc'
        | 'amount-asc'
        | 'progress-desc'
        | 'progress-asc';
    let sortMode = $state<SortMode>('almost-finished');

    const SORT_LABELS: Record<SortMode, string> = {
        'almost-finished': 'Almost finished',
        'end-date-desc': 'End date (latest)',
        'amount-desc': 'Amount (high → low)',
        'amount-asc': 'Amount (low → high)',
        'progress-desc': 'Progress (high → low)',
        'progress-asc': 'Progress (low → high)',
    };

    function progressFraction(r: Rule): number {
        const total = r.endAfterCount ?? 0;
        if (total <= 0) return 0;
        return r.progress.paidCount / total;
    }

    const sortedActiveInstallments = $derived.by(() => {
        const arr = [...activeInstallments];
        return arr.sort((a, b) => {
            switch (sortMode) {
                case 'almost-finished': {
                    const aEnd = a.progress.finalOccurrenceAt ?? '￿';
                    const bEnd = b.progress.finalOccurrenceAt ?? '￿';
                    if (aEnd !== bEnd) return aEnd.localeCompare(bEnd);
                    // tiebreaker: fewer remaining first
                    const aRem = (a.endAfterCount ?? 0) - a.progress.paidCount;
                    const bRem = (b.endAfterCount ?? 0) - b.progress.paidCount;
                    return aRem - bRem;
                }
                case 'end-date-desc': {
                    const aEnd = a.progress.finalOccurrenceAt ?? '';
                    const bEnd = b.progress.finalOccurrenceAt ?? '';
                    return bEnd.localeCompare(aEnd);
                }
                case 'amount-desc':
                    return ruleAmount(b) - ruleAmount(a);
                case 'amount-asc':
                    return ruleAmount(a) - ruleAmount(b);
                case 'progress-desc':
                    return progressFraction(b) - progressFraction(a);
                case 'progress-asc':
                    return progressFraction(a) - progressFraction(b);
                default:
                    return 0;
            }
        });
    });

    let showCompletedInstallments = $state(false);

    // ── Stage-of-life tint for installment rows ─────────────────────────
    // Buckets on remaining count. Drives a 4px left border + subtle
    // left-fading background gradient built from design tokens, so it
    // follows light/dark theme without relying on raw Tailwind colors.
    type InstallmentStage = 'long' | 'mid' | 'near' | 'done';

    function installmentStage(rule: Rule): InstallmentStage {
        if (rule.endAfterCount === null) return 'long';
        if (rule.status === 'ended') return 'done';
        const remaining = rule.endAfterCount - rule.progress.paidCount;
        if (remaining <= 0) return 'done';
        if (remaining <= 2) return 'near';
        if (remaining <= 6) return 'mid';
        return 'long';
    }

    // Stage styles are defined as classes in app.css (see .installment-stage-*).
    // Using named classes sidesteps Tailwind compilation of arbitrary tokens
    // and keeps the CSS with the rest of the design-token layer.
    function stageClass(stage: InstallmentStage): string {
        return `installment-stage-${stage}`;
    }
</script>

<svelte:head>
    <title>Recurring - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4 space-y-6">
    <div class="flex items-center gap-2">
        <div class="flex-1">
            <h1 class="text-2xl font-bold">Recurring</h1>
            <p class="text-xs text-muted-foreground mt-0.5">Rules that generate expenses on a schedule.</p>
        </div>
        <Button size="sm" onclick={() => goto(`/vaults/${vaultId}/recurring/new`)}>
            <Plus class="size-4" />
            <span>New rule</span>
        </Button>
    </div>

    {#if isLoading && rules.length === 0}
        <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full size-10 border-b-2 border-primary"></div>
        </div>
    {:else}
        <!-- Pending approvals -->
        {#if pending.length > 0}
            <section>
                <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Pending approvals ({pending.length})
                </h2>
                <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                    {#each pending as occ (occ.id)}
                        <div class="flex items-center gap-3 px-3 py-2.5">
                            <span class="text-xl leading-none shrink-0" aria-hidden="true">
                                {occ.templateIcon ?? '🔁'}
                            </span>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium break-words">
                                    {occ.ruleName || occ.templateName || 'Recurring expense'}
                                </p>
                                <p class="text-xs text-muted-foreground mt-0.5">
                                    Due {fmt.date(occ.dueDate)}
                                    {#if occ.templateCategory}
                                        <span class="opacity-50">·</span> {occ.templateCategory}
                                    {/if}
                                </p>
                            </div>
                            <div class="shrink-0 text-right">
                                <Amount
                                    value={-occ.suggestedAmount}
                                    sign="negative"
                                    showSign={false}
                                    formatted={fmt.currency(occ.suggestedAmount)}
                                    size="sm"
                                />
                            </div>
                            <div class="flex gap-1 shrink-0">
                                <button
                                    type="button"
                                    onclick={() => handleApprove(occ)}
                                    class="p-1.5 rounded-[var(--radius-sm)] hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                    aria-label="Approve"
                                    title="Approve"
                                >
                                    <Check class="size-4" />
                                </button>
                                {#if occ.ruleEndAfterCount === null}
                                    <button
                                        type="button"
                                        onclick={() => handleSkipPending(occ)}
                                        class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground"
                                        aria-label="Skip"
                                        title="Skip"
                                    >
                                        <X class="size-4" />
                                    </button>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- Upcoming -->
        {#if upcoming.length > 0}
            <section>
                <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Upcoming (next 7 days)
                </h2>
                <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                    {#each upcoming as occ (occ.ruleId + occ.dueDate)}
                        <div class="flex items-center gap-3 px-3 py-2">
                            <span class="text-xl leading-none shrink-0" aria-hidden="true">
                                {occ.templateIcon ?? '🔁'}
                            </span>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium break-words text-sm">
                                    {occ.ruleName || occ.templateName || 'Recurring expense'}
                                </p>
                                <p class="text-xs text-muted-foreground mt-0.5">
                                    {fmt.date(occ.dueDate)}
                                    <span class="opacity-50">·</span>
                                    <span class="inline-flex items-center gap-0.5">
                                        {occ.generationMode === 'auto' ? 'Auto' : 'Approval'}
                                    </span>
                                </p>
                            </div>
                            <div class="shrink-0 text-right">
                                <Amount
                                    value={-occ.amount}
                                    sign="negative"
                                    showSign={false}
                                    formatted={fmt.currency(occ.amount)}
                                    size="sm"
                                />
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- Whole-page empty state -->
        {#if rules.length === 0}
            <Card>
                <CardContent class="py-10">
                    <EmptyState
                        icon={RefreshCw}
                        title="No recurring rules yet"
                        description="Create a rule to automate repeating expenses like rent, subscriptions, or installments."
                    >
                        {#snippet primary()}
                            <Button size="sm" onclick={() => goto(`/vaults/${vaultId}/recurring/new`)}>
                                <Plus class="size-4" />
                                Create a rule
                            </Button>
                        {/snippet}
                    </EmptyState>
                </CardContent>
            </Card>
        {/if}

        <!-- Installments -->
        {#if installmentRules.length > 0}
            <section>
                <div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Installments ({activeInstallments.length})
                    </h2>
                    {#if activeInstallments.length > 1}
                        <Select.Root
                            type="single"
                            value={sortMode}
                            onValueChange={(v: string | undefined) => (sortMode = (v ?? 'almost-finished') as SortMode)}
                        >
                            <Select.Trigger class="h-8 w-auto min-w-[180px] text-xs" aria-label="Sort installments">
                                <span>Sort: {SORT_LABELS[sortMode]}</span>
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="almost-finished" label="Almost finished" />
                                <Select.Item value="end-date-desc" label="End date (latest)" />
                                <Select.Item value="amount-desc" label="Amount (high → low)" />
                                <Select.Item value="amount-asc" label="Amount (low → high)" />
                                <Select.Item value="progress-desc" label="Progress (high → low)" />
                                <Select.Item value="progress-asc" label="Progress (low → high)" />
                            </Select.Content>
                        </Select.Root>
                    {/if}
                </div>

                {#if activeInstallments.length > 0}
                    <p class="text-xs text-muted-foreground mb-2">
                        {installmentSummary.active} active ·
                        <span class="font-mono">{fmt.currency(installmentSummary.monthlyCommit)}</span>/period committed
                        {#if installmentSummary.totalAmount > 0}
                            <span class="opacity-50">·</span>
                            <span class="font-mono">{fmt.currency(installmentSummary.paidAmount)}</span>
                            of
                            <span class="font-mono">{fmt.currency(installmentSummary.totalAmount)}</span>
                            paid ({installmentSummary.pct}%)
                        {/if}
                    </p>

                    <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                        {#each sortedActiveInstallments as rule (rule.id)}
                            {@render ruleRow(rule)}
                        {/each}
                    </div>
                {/if}

                {#if completedInstallments.length > 0}
                    <button
                        type="button"
                        onclick={() => (showCompletedInstallments = !showCompletedInstallments)}
                        class="mt-3 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                        {showCompletedInstallments ? 'Hide' : 'Show'} completed ({completedInstallments.length})
                    </button>
                    {#if showCompletedInstallments}
                        <div class="mt-2 rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden opacity-70">
                            {#each completedInstallments as rule (rule.id)}
                                {@render ruleRow(rule)}
                            {/each}
                        </div>
                    {/if}
                {/if}
            </section>
        {/if}

        <!-- Subscriptions -->
        {#if subscriptionRules.length > 0}
            <section>
                <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Subscriptions ({subscriptionRules.length})
                </h2>
                <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                    {#each subscriptionRules as rule (rule.id)}
                        {@render ruleRow(rule)}
                    {/each}
                </div>
            </section>
        {/if}
    {/if}
</div>

{#snippet ruleRow(rule: Rule)}
    {@const isInstallment = rule.endAfterCount !== null}
    {@const stage = isInstallment ? installmentStage(rule) : null}
    <div
        class="flex items-start gap-3 px-3 py-2.5 border-l-4 {stage
            ? stageClass(stage)
            : 'border-l-transparent'}"
    >
        <span class="text-xl leading-none shrink-0 mt-0.5" aria-hidden="true">
            {rule.template.icon ?? '🔁'}
        </span>
        <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
                <p class="font-medium break-words">{displayName(rule)}</p>
                {#if rule.endAfterCount !== null}
                    <span class="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 bg-primary/10 text-primary">
                        installment
                    </span>
                {/if}
                {#if rule.status !== 'active'}
                    <span
                        class="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 {rule.status === 'paused'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-destructive/10 text-destructive'}"
                    >
                        {rule.status}
                    </span>
                {/if}
                <span
                    class="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 bg-secondary text-secondary-foreground"
                >
                    {rule.generationMode}
                </span>
            </div>
            <p class="text-xs text-muted-foreground mt-0.5">
                {scheduleLabel(rule)}
                <span class="opacity-50">·</span>
                <span class="font-mono">{fmt.currency(ruleAmount(rule))}</span>
                {#if rule.endAfterCount === null && rule.nextOccurrenceAt && rule.status === 'active'}
                    <span class="opacity-50">·</span>
                    Next {fmt.date(rule.nextOccurrenceAt)}
                {/if}
            </p>
            {#if rule.endAfterCount !== null}
                {@const paid = rule.progress.paidCount}
                {@const total = rule.endAfterCount}
                {@const remaining = total - paid}
                {@const totalAmt = rule.progress.totalAmount ?? 0}
                {@const paidAmt = rule.progress.paidAmount}
                {@const endedMeetsTarget = rule.status === 'ended' && totalAmt > 0 && paidAmt + 0.005 >= totalAmt}
                {@const endedEarly = rule.status === 'ended' && totalAmt > 0 && paidAmt + 0.005 < totalAmt && paid < total}
                {@const pct = endedMeetsTarget || endedEarly
                    ? 100
                    : Math.min(100, Math.round((paid / total) * 100))}
                <div class="mt-1.5 space-y-1">
                    <p class="text-xs">
                        {#if endedMeetsTarget}
                            <span class="font-medium text-foreground">Settled in full</span>
                            <span class="text-muted-foreground"> · </span>
                            <span class="font-mono tabular-nums">{fmt.currency(paidAmt)}</span>
                        {:else if endedEarly}
                            {@const saved = totalAmt - paidAmt}
                            <span class="font-medium text-foreground">Settled early</span>
                            <span class="text-muted-foreground"> · </span>
                            <span class="font-mono tabular-nums">{fmt.currency(paidAmt)}</span>
                            <span class="text-muted-foreground">(saved <span class="font-mono">{fmt.currency(saved)}</span>)</span>
                        {:else}
                            <span class="font-medium tabular-nums">{paid} of {total} paid</span>
                            <span class="text-muted-foreground"> · </span>
                            <span class="font-mono tabular-nums">{fmt.currency(paidAmt)}</span>
                            {#if rule.progress.totalAmount !== null}
                                <span class="text-muted-foreground">of</span>
                                <span class="font-mono tabular-nums">{fmt.currency(rule.progress.totalAmount)}</span>
                            {/if}
                        {/if}
                    </p>
                    <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                            class="h-full rounded-full transition-all duration-500 bg-primary"
                            style="width: {pct}%"
                        ></div>
                    </div>
                    <p class="text-xs text-muted-foreground">
                        {#if rule.status === 'active' && remaining > 0}
                            {remaining} left
                            {#if rule.nextOccurrenceAt}
                                <span class="opacity-50">·</span>
                                Next {fmt.date(rule.nextOccurrenceAt)}
                            {/if}
                        {:else if endedMeetsTarget || endedEarly}
                            <!-- "Settled" state — header line already conveys status, keep this line minimal -->
                        {:else if remaining === 0}
                            Complete
                        {/if}
                        {#if rule.progress.finalOccurrenceAt && !endedMeetsTarget && !endedEarly}
                            <span class="opacity-50">·</span>
                            Ends {fmt.date(rule.progress.finalOccurrenceAt)}
                        {/if}
                        {#if rule.progress.pendingCount > 0}
                            <span class="opacity-50">·</span>
                            <span class="text-amber-600 dark:text-amber-400">{rule.progress.pendingCount} pending</span>
                        {/if}
                    </p>
                </div>
            {/if}
        </div>
        <div class="flex gap-0.5 shrink-0">
            <button
                type="button"
                onclick={() => goto(`/vaults/${vaultId}/recurring/${rule.id}/edit`)}
                class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Edit"
                title="Edit"
            >
                <Pencil class="size-3.5" />
            </button>
            <button
                type="button"
                onclick={() => goto(`/vaults/${vaultId}/recurring/new?duplicateFrom=${rule.id}`)}
                class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Duplicate"
                title="Duplicate"
            >
                <Copy class="size-3.5" />
            </button>
            {#if rule.status === 'paused'}
                <button
                    type="button"
                    onclick={() => handleResumeRule(rule)}
                    class="p-1.5 rounded-[var(--radius-sm)] hover:bg-primary/10 text-muted-foreground hover:text-primary"
                    aria-label="Resume"
                    title="Resume"
                >
                    <Play class="size-3.5" />
                </button>
            {/if}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger
                    class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center"
                    aria-label="More actions"
                    title="More"
                >
                    <MoreVertical class="size-3.5" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" class="min-w-[12rem]">
                    {#if rule.status === 'active'}
                        <DropdownMenu.Item onclick={() => askSkipNext(rule)}>
                            <SkipForward class="size-3.5" />
                            <span>Skip next occurrence</span>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onclick={() => askPauseRule(rule)}>
                            <Pause class="size-3.5" />
                            <span>Pause rule</span>
                        </DropdownMenu.Item>
                    {/if}
                    {#if rule.endAfterCount !== null && rule.status !== 'ended'}
                        <DropdownMenu.Item onclick={() => askSettle(rule)}>
                            <CircleCheck class="size-3.5" />
                            <span>Settle in full…</span>
                        </DropdownMenu.Item>
                    {/if}
                    {#if rule.status === 'active' || (rule.endAfterCount !== null && rule.status !== 'ended')}
                        <DropdownMenu.Separator />
                    {/if}
                    <DropdownMenu.Item destructive onclick={() => handleDeleteRule(rule)}>
                        <Trash2 class="size-3.5" />
                        <span>Delete rule…</span>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    </div>
{/snippet}

{#if deleteTarget}
    {@const paidCount = deleteTarget.progress.paidCount}
    {@const paidAmount = deleteTarget.progress.paidAmount}
    {@const pendingCount = deleteTarget.progress.pendingCount}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
    >
        <button
            type="button"
            class="fixed inset-0 bg-black/50"
            onclick={cancelDelete}
            aria-label="Close"
        ></button>
        <div class="relative z-10 w-full max-w-md rounded-[var(--radius-md)] border bg-card shadow-lg">
            <div class="p-5 space-y-3">
                <h3 class="text-base font-semibold">
                    Delete "{displayName(deleteTarget)}"?
                </h3>
                <div class="text-sm text-muted-foreground space-y-1">
                    {#if paidCount > 0}
                        <p>
                            This rule has generated
                            <span class="font-medium text-foreground">{paidCount} expense{paidCount === 1 ? '' : 's'}</span>
                            ({fmt.currency(paidAmount)}).
                        </p>
                    {:else}
                        <p>This rule hasn't generated any expenses yet.</p>
                    {/if}
                    {#if pendingCount > 0}
                        <p>
                            <span class="font-medium text-foreground">{pendingCount} pending approval{pendingCount === 1 ? '' : 's'}</span>
                            will be swept either way.
                        </p>
                    {/if}
                </div>
            </div>
            <div class="border-t p-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" size="sm" onclick={cancelDelete} disabled={deleting}>
                    Cancel
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onclick={() => confirmDelete(false)}
                    disabled={deleting}
                >
                    Delete rule only
                </Button>
                {#if paidCount > 0}
                    <Button
                        variant="destructive"
                        size="sm"
                        onclick={() => confirmDelete(true)}
                        disabled={deleting}
                    >
                        Delete rule + {paidCount} expense{paidCount === 1 ? '' : 's'}
                    </Button>
                {/if}
            </div>
        </div>
    </div>
{/if}

{#if settleTarget}
    {@const rule = settleTarget}
    {@const remaining = (rule.endAfterCount ?? 0) - rule.progress.paidCount}
    {@const suggested = remaining * ruleAmount(rule)}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
    >
        <button
            type="button"
            class="fixed inset-0 bg-black/50"
            onclick={cancelSettle}
            aria-label="Close"
        ></button>
        <div class="relative z-10 w-full max-w-md rounded-[var(--radius-md)] border bg-card shadow-lg">
            <div class="p-5 space-y-4">
                <div>
                    <h3 class="text-base font-semibold">
                        Settle "{displayName(rule)}" in full?
                    </h3>
                    <p class="text-xs text-muted-foreground mt-1">
                        {remaining} period{remaining === 1 ? '' : 's'} remaining · suggested <span class="font-mono">{fmt.currency(suggested)}</span>
                    </p>
                </div>
                <div class="space-y-2">
                    <Label for="settle-amount">Settlement amount</Label>
                    <Input
                        id="settle-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        bind:value={settleAmount}
                        disabled={settling}
                    />
                </div>
                <div class="space-y-2">
                    <Label for="settle-date">Date</Label>
                    <DateTimePicker
                        id="settle-date"
                        bind:value={settleDate}
                        disabled={settling}
                    />
                </div>
                <div class="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                    <p>This will:</p>
                    <ul class="list-disc pl-5 space-y-0.5">
                        <li>Record a <span class="font-mono text-foreground">{fmt.currency(settleAmount || 0)}</span> expense linked to this rule</li>
                        <li>End the rule (no more firings)</li>
                        <li>Sweep any pending approvals for this rule</li>
                    </ul>
                </div>
            </div>
            <div class="border-t p-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" size="sm" onclick={cancelSettle} disabled={settling}>
                    Cancel
                </Button>
                <Button size="sm" onclick={confirmSettle} disabled={settling}>
                    Settle
                </Button>
            </div>
        </div>
    </div>
{/if}

{#if confirmAction}
    {@const rule = confirmAction.rule}
    {@const isSkip = confirmAction.type === 'skip'}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
    >
        <button
            type="button"
            class="fixed inset-0 bg-black/50"
            onclick={cancelConfirm}
            aria-label="Close"
        ></button>
        <div class="relative z-10 w-full max-w-md rounded-[var(--radius-md)] border bg-card shadow-lg">
            <div class="p-5 space-y-3">
                <h3 class="text-base font-semibold">
                    {isSkip ? 'Skip next occurrence?' : 'Pause rule?'}
                </h3>
                <p class="text-sm text-muted-foreground">
                    {#if isSkip}
                        The next occurrence of <span class="font-medium text-foreground">{displayName(rule)}</span> will be skipped — its next-occurrence date advances one period and no expense is created.
                    {:else}
                        <span class="font-medium text-foreground">{displayName(rule)}</span> will stop firing until you resume it. No new expenses or pending items will be created in the meantime.
                    {/if}
                </p>
            </div>
            <div class="border-t p-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" size="sm" onclick={cancelConfirm} disabled={confirming}>
                    Cancel
                </Button>
                <Button size="sm" onclick={executeConfirm} disabled={confirming}>
                    {#if isSkip}Skip{:else}Pause{/if}
                </Button>
            </div>
        </div>
    </div>
{/if}

<Toaster />
