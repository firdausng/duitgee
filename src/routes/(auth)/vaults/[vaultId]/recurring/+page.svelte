<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { EmptyState } from '$lib/components/ui/empty-state';
    import { Amount } from '$lib/components/ui/amount';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { createVaultFormatters } from '$lib/vaultFormatting';
    import {
        ruleAmount,
        ordinal,
        scheduleLabel as buildScheduleLabel,
        installmentSummary as computeInstallmentSummary,
        subscriptionSummary as computeSubscriptionSummary,
        topInstallmentsAlmostFinished,
        remainingAmount,
    } from '$lib/recurring-helpers';
    import type { VaultWithMember } from '$lib/schemas/read/vaultWithMember';
    import Plus from '@lucide/svelte/icons/plus';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Copy from '@lucide/svelte/icons/copy';
    import * as Select from '$lib/components/ui/select';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import MoreVertical from '@lucide/svelte/icons/more-vertical';
    import CircleCheck from '@lucide/svelte/icons/circle-check';
    import LayoutList from '@lucide/svelte/icons/layout-list';
    import Table2 from '@lucide/svelte/icons/table-2';
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
    import Search from '@lucide/svelte/icons/search';
    import Sparkles from '@lucide/svelte/icons/sparkles';
    import { hasEntitlement } from '$lib/configurations/plans';
    import { RECURRING_MAX_PER_VAULT_FREE } from '$lib/schemas/recurringExpenses';
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

    // ── Search (URL-synced via ?q=) ─────────────────────────────────────
    const searchQuery = $derived(page.url.searchParams.get('q') ?? '');
    const searchActive = $derived(searchQuery.trim().length > 0);

    function setSearchQuery(value: string) {
        const params = new URLSearchParams(page.url.searchParams);
        if (value.trim()) params.set('q', value);
        else params.delete('q');
        const qs = params.toString();
        goto(qs ? `${page.url.pathname}?${qs}` : page.url.pathname, {
            replaceState: true,
            keepFocus: true,
            noScroll: true,
        });
    }

    function matchesSearch(fields: Array<string | null | undefined>): boolean {
        if (!searchActive) return true;
        const q = searchQuery.toLowerCase();
        return fields.some((f) => (f ?? '').toLowerCase().includes(q));
    }

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

    // Raw API results
    const allRules = $derived(rulesResource.current ?? []);
    const allPending = $derived(pendingResource.current ?? []);
    const allUpcoming = $derived(upcomingResource.current ?? []);

    // ── Top-of-page commitment summary (computed over ALL rules, not search-filtered) ──
    const subSummary = $derived(computeSubscriptionSummary(allRules));
    const instSummary = $derived(computeInstallmentSummary(allRules));
    const totalMonthlyCommit = $derived(subSummary.monthlyCommit + instSummary.monthlyCommit);
    const endingSoon = $derived(topInstallmentsAlmostFinished(allRules, 3));

    // Plan-gate: free vaults can have up to RECURRING_MAX_PER_VAULT_FREE active rules.
    const planId = $derived(vaultResource.current?.vaults.planId ?? 'plan_free');
    const canCreateMultiple = $derived(hasEntitlement(planId, 'recurring:create_multiple'));
    const activeRulesCount = $derived(allRules.filter((r) => r.status === 'active').length);
    const atRecurringLimit = $derived(
        !canCreateMultiple && activeRulesCount >= RECURRING_MAX_PER_VAULT_FREE,
    );

    // Search-filtered views. Empty search → unchanged arrays.
    const rules = $derived(
        allRules.filter((r) =>
            matchesSearch([r.name, r.template.name, r.template.defaultCategoryName]),
        ),
    );
    const pending = $derived(
        allPending.filter((p) =>
            matchesSearch([p.ruleName, p.templateName, p.templateCategory]),
        ),
    );
    const upcoming = $derived(
        allUpcoming.filter((u) => matchesSearch([u.ruleName, u.templateName])),
    );
    const isLoading = $derived(
        rulesResource.loading || pendingResource.loading || upcomingResource.loading,
    );

    function scheduleLabel(rule: Rule): string {
        return buildScheduleLabel(rule, fmt.getLocale());
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
        // Prefer the *declared* outstanding balance (totalAmount − paidAmount) when set;
        // fall back to estimated (remaining_count × per_period) for rules without a declared total.
        const remaining = remainingAmount(rule);
        settleAmount = Math.max(0.01, remaining.value);
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

    const installmentSummary = $derived(computeInstallmentSummary(rules));

    type SortMode =
        | 'almost-finished'
        | 'end-date-desc'
        | 'amount-desc'
        | 'amount-asc'
        | 'remaining-amount-asc'
        | 'remaining-amount-desc'
        | 'progress-desc'
        | 'progress-asc';
    let sortMode = $state<SortMode>('almost-finished');

    const SORT_LABELS: Record<SortMode, string> = {
        'almost-finished': 'Almost finished',
        'end-date-desc': 'End date (latest)',
        'amount-desc': 'Amount (high → low)',
        'amount-asc': 'Amount (low → high)',
        'remaining-amount-asc': 'Remaining (low → high)',
        'remaining-amount-desc': 'Remaining (high → low)',
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
                case 'remaining-amount-asc':
                    return remainingAmount(a).value - remainingAmount(b).value;
                case 'remaining-amount-desc':
                    return remainingAmount(b).value - remainingAmount(a).value;
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

    // ── View mode (card / table) ────────────────────────────────────────
    type ViewMode = 'card' | 'table';
    let viewMode = $state<ViewMode>('card');
    const viewStorageKey = $derived(`dg:recurring:view:${vaultId}`);

    onMount(() => {
        const saved = localStorage.getItem(viewStorageKey);
        if (saved === 'table' || saved === 'card') viewMode = saved;
    });

    function setViewMode(mode: ViewMode) {
        viewMode = mode;
        try {
            localStorage.setItem(viewStorageKey, mode);
        } catch {
            // no-op if storage unavailable
        }
    }

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

    // Used in the table's sticky first cell. The cell needs an opaque bg for
    // the sticky overlap, so we skip the full .installment-stage-* gradient
    // and only apply the left-border color.
    function stageBorderColorStyle(stage: InstallmentStage): string {
        switch (stage) {
            case 'done':
            case 'near':
                return 'border-left-color: var(--amount-positive);';
            case 'mid':
                return 'border-left-color: var(--accent-strong);';
            default:
                return 'border-left-color: transparent;';
        }
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
        <div class="flex flex-col items-end gap-1">
            <Button
                size="sm"
                onclick={() => goto(`/vaults/${vaultId}/recurring/new`)}
                disabled={atRecurringLimit}
                title={atRecurringLimit ? `Free plan allows up to ${RECURRING_MAX_PER_VAULT_FREE} active recurring rules. Upgrade to Pro for unlimited.` : undefined}
            >
                <Plus class="size-4" />
                <span>New rule</span>
            </Button>
            {#if atRecurringLimit}
                <a
                    href="/settings/plan"
                    class="text-[11px] font-medium text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 hover:text-amber-700 dark:hover:text-amber-300 hover:underline underline-offset-2 transition-colors"
                >
                    <Sparkles class="size-3" />
                    Free: {RECURRING_MAX_PER_VAULT_FREE} rules · Pro: unlimited
                </a>
            {/if}
        </div>
    </div>

    <!-- Commitment summary -->
    {#if allRules.length > 0}
        <Card>
            <CardContent class="pt-6 space-y-4">
                <div class="grid gap-4 md:grid-cols-3">
                    <div>
                        <p class="text-xs text-muted-foreground uppercase tracking-wide">Monthly committed</p>
                        <Amount
                            value={totalMonthlyCommit}
                            sign="neutral"
                            size="hero"
                            locale={vaultResource.current?.vaults.locale || 'en-US'}
                            currency={vaultResource.current?.vaults.currency || 'USD'}
                        />
                        <p class="text-xs text-muted-foreground mt-0.5">
                            Across {subSummary.active + instSummary.active} active rule{(subSummary.active + instSummary.active) === 1 ? '' : 's'}
                        </p>
                    </div>

                    <div class="border-l md:pl-4 md:border-l border-border/60">
                        <p class="text-xs text-muted-foreground uppercase tracking-wide">Subscriptions</p>
                        <p class="text-lg font-semibold font-mono">
                            {fmt.currency(subSummary.monthlyCommit)}<span class="text-xs text-muted-foreground font-normal">/mo</span>
                        </p>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            {subSummary.active} active
                        </p>
                    </div>

                    <div class="border-l md:pl-4 md:border-l border-border/60">
                        <p class="text-xs text-muted-foreground uppercase tracking-wide">Installments</p>
                        <p class="text-lg font-semibold font-mono">
                            {fmt.currency(instSummary.monthlyCommit)}<span class="text-xs text-muted-foreground font-normal">/mo</span>
                        </p>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            {instSummary.active} active{#if instSummary.totalAmount > 0} · {instSummary.pct}% paid{/if}
                        </p>
                    </div>
                </div>

                {#if endingSoon.length > 0}
                    <div class="border-t pt-3">
                        <p class="text-xs text-muted-foreground uppercase tracking-wide mb-2">Ending soon</p>
                        <ul class="space-y-1">
                            {#each endingSoon as rule (rule.id)}
                                {@const remaining = (rule.endAfterCount ?? 0) - rule.progress.paidCount}
                                <li class="flex items-center justify-between gap-2 text-sm">
                                    <span class="flex items-center gap-2 min-w-0">
                                        <span class="text-base shrink-0" aria-hidden="true">{rule.template.icon ?? '🔁'}</span>
                                        <span class="truncate">{rule.name || rule.template.name || 'Rule'}</span>
                                    </span>
                                    <span class="text-xs text-muted-foreground shrink-0">
                                        {remaining} payment{remaining === 1 ? '' : 's'} left
                                        {#if rule.progress.finalOccurrenceAt}
                                            · ends {fmt.date(rule.progress.finalOccurrenceAt)}
                                        {/if}
                                    </span>
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </CardContent>
        </Card>
    {/if}

    <!-- Search -->
    {#if allRules.length > 0 || allPending.length > 0 || searchActive}
        <div class="relative max-w-md">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
                type="search"
                placeholder="Search recurring rules…"
                value={searchQuery}
                oninput={(e) => setSearchQuery((e.currentTarget as HTMLInputElement).value)}
                class="pl-8 {searchActive ? 'pr-9' : ''}"
                aria-label="Search recurring rules"
            />
            {#if searchActive}
                <button
                    type="button"
                    onclick={() => setSearchQuery('')}
                    class="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                    title="Clear"
                >
                    <X class="size-3.5" />
                </button>
            {/if}
        </div>
    {/if}

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
        {#if rules.length === 0 && pending.length === 0 && upcoming.length === 0}
            <Card>
                <CardContent class="py-10">
                    {#if searchActive}
                        <EmptyState
                            icon={Search}
                            title="No matches"
                            description={`Nothing in recurring rules matches "${searchQuery}".`}
                        >
                            {#snippet secondary()}
                                <Button variant="outline" size="sm" onclick={() => setSearchQuery('')}>
                                    Clear search
                                </Button>
                            {/snippet}
                        </EmptyState>
                    {:else}
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
                    {/if}
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
                    <div class="flex items-center gap-2">
                        {@render viewToggle()}
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
                                    <Select.Item value="remaining-amount-asc" label="Remaining (low → high)" />
                                    <Select.Item value="remaining-amount-desc" label="Remaining (high → low)" />
                                    <Select.Item value="amount-desc" label="Amount (high → low)" />
                                    <Select.Item value="amount-asc" label="Amount (low → high)" />
                                    <Select.Item value="progress-desc" label="Progress (high → low)" />
                                    <Select.Item value="progress-asc" label="Progress (low → high)" />
                                </Select.Content>
                            </Select.Root>
                        {/if}
                    </div>
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

                    {#if viewMode === 'card'}
                        <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                            {#each sortedActiveInstallments as rule (rule.id)}
                                {@render ruleRow(rule)}
                            {/each}
                        </div>
                    {:else}
                        {@render installmentTable(sortedActiveInstallments, false)}
                    {/if}
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
                        {#if viewMode === 'card'}
                            <div class="mt-2 rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden opacity-70">
                                {#each completedInstallments as rule (rule.id)}
                                    {@render ruleRow(rule)}
                                {/each}
                            </div>
                        {:else}
                            <div class="mt-2 opacity-70">
                                {@render installmentTable(completedInstallments, true)}
                            </div>
                        {/if}
                    {/if}
                {/if}
            </section>
        {/if}

        <!-- Subscriptions -->
        {#if subscriptionRules.length > 0}
            <section>
                <div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Subscriptions ({subscriptionRules.length})
                    </h2>
                    {@render viewToggle()}
                </div>
                {#if viewMode === 'card'}
                    <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                        {#each subscriptionRules as rule (rule.id)}
                            {@render ruleRow(rule)}
                        {/each}
                    </div>
                {:else}
                    {@render subscriptionTable(subscriptionRules)}
                {/if}
            </section>
        {/if}
    {/if}
</div>

{#snippet viewToggle()}
    <div class="inline-flex items-center rounded-md border overflow-hidden" role="group" aria-label="View mode">
        <button
            type="button"
            onclick={() => setViewMode('card')}
            class="p-1.5 {viewMode === 'card'
                ? 'bg-muted text-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground'}"
            aria-label="Card view"
            aria-pressed={viewMode === 'card'}
            title="Card view"
        >
            <LayoutList class="size-4" />
        </button>
        <button
            type="button"
            onclick={() => setViewMode('table')}
            class="p-1.5 border-l {viewMode === 'table'
                ? 'bg-muted text-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground'}"
            aria-label="Table view"
            aria-pressed={viewMode === 'table'}
            title="Table view"
        >
            <Table2 class="size-4" />
        </button>
    </div>
{/snippet}

{#snippet kebabCell(rule: Rule)}
    <DropdownMenu.Root>
        <DropdownMenu.Trigger
            class="p-1 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center"
            aria-label="More actions"
            title="More"
        >
            <MoreVertical class="size-4" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="min-w-[13rem]">
            <DropdownMenu.Item
                disabled={atRecurringLimit}
                onclick={() => goto(`/vaults/${vaultId}/recurring/new?duplicateFrom=${rule.id}`)}
            >
                <Copy class="size-3.5" />
                <span>Duplicate{atRecurringLimit ? ' (Pro)' : ''}</span>
            </DropdownMenu.Item>
            {#if rule.status === 'active'}
                <DropdownMenu.Separator />
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
            <DropdownMenu.Separator />
            <DropdownMenu.Item destructive onclick={() => handleDeleteRule(rule)}>
                <Trash2 class="size-3.5" />
                <span>Delete rule…</span>
            </DropdownMenu.Item>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
{/snippet}

{#snippet installmentTable(rows: Rule[], muted: boolean)}
    <div class="rounded-[var(--radius-md)] border bg-card overflow-x-auto">
        <table class="w-full text-sm min-w-[780px] border-collapse {muted ? '' : ''}">
            <thead class="bg-muted/40 border-b">
                <tr class="text-xs text-muted-foreground uppercase tracking-wide">
                    <th class="text-left font-medium px-3 py-2 sticky left-0 z-20 bg-muted/40 border-r w-[200px] min-w-[200px]">Name</th>
                    <th class="text-left font-medium px-3 py-2">Schedule</th>
                    <th class="text-right font-medium px-3 py-2">Amount</th>
                    <th class="text-left font-medium px-3 py-2 min-w-[160px]">Progress</th>
                    <th class="text-right font-medium px-3 py-2">Remaining</th>
                    <th class="text-left font-medium px-3 py-2">Status</th>
                    <th class="w-10"></th>
                </tr>
            </thead>
            <tbody class="divide-y">
                {#each rows as rule (rule.id)}
                    {@const stage = installmentStage(rule)}
                    {@const paid = rule.progress.paidCount}
                    {@const total = rule.endAfterCount ?? 0}
                    {@const totalAmt = rule.progress.totalAmount ?? 0}
                    {@const paidAmt = rule.progress.paidAmount}
                    {@const endedMeetsTarget = rule.status === 'ended' && totalAmt > 0 && paidAmt + 0.005 >= totalAmt}
                    {@const endedEarly = rule.status === 'ended' && totalAmt > 0 && paidAmt + 0.005 < totalAmt && paid < total}
                    {@const pct = endedMeetsTarget || endedEarly
                        ? 100
                        : Math.min(100, Math.round((paid / total) * 100))}
                    <tr
                        role="button"
                        tabindex="0"
                        onclick={(e) => {
                            const t = e.target as HTMLElement;
                            if (t.closest('button, [role="menuitem"], [data-no-nav]')) return;
                            goto(`/vaults/${vaultId}/recurring/${rule.id}/edit`);
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                goto(`/vaults/${vaultId}/recurring/${rule.id}/edit`);
                            }
                        }}
                        class="group cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                        <td
                            class="px-3 py-2 border-l-4 border-r sticky left-0 z-10 bg-card group-hover:bg-muted/30 w-[200px] min-w-[200px] max-w-[200px]"
                            style={stageBorderColorStyle(stage)}
                        >
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="shrink-0" aria-hidden="true">{rule.template.icon ?? '🔁'}</span>
                                <span class="font-medium truncate" title={displayName(rule)}>{displayName(rule)}</span>
                            </div>
                        </td>
                        <td class="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {scheduleLabel(rule)}
                        </td>
                        <td class="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                            {fmt.currency(ruleAmount(rule))}
                        </td>
                        <td class="px-3 py-2">
                            <div class="flex items-center gap-2">
                                <div class="h-1 flex-1 rounded-full bg-muted overflow-hidden min-w-[60px]">
                                    <div
                                        class="h-full rounded-full transition-all duration-500 bg-primary"
                                        style="width: {pct}%"
                                    ></div>
                                </div>
                                <span class="text-xs tabular-nums text-muted-foreground whitespace-nowrap">{paid}/{total}</span>
                            </div>
                        </td>
                        <td class="px-3 py-2 text-right whitespace-nowrap">
                            {#if endedMeetsTarget}
                                <span class="text-xs font-medium text-foreground">Settled</span>
                            {:else if endedEarly}
                                <span class="text-xs font-medium text-foreground">Settled early</span>
                            {:else}
                                {@const remaining = remainingAmount(rule)}
                                {@const canSettle = rule.status === 'active' && remaining.value > 0}
                                <div class="flex items-center justify-end gap-2">
                                    <span class="font-mono tabular-nums text-sm font-medium" title="{remaining.source === 'declared' ? 'Declared outstanding balance' : 'Estimated from per-period amount'}">
                                        {remaining.source === 'estimated' ? '~' : ''}{fmt.currency(remaining.value)}
                                    </span>
                                    {#if canSettle}
                                        <button
                                            type="button"
                                            data-no-nav
                                            onclick={(e) => { e.stopPropagation(); askSettle(rule); }}
                                            class="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                                            title="Settle this installment in full"
                                        >
                                            <CircleCheck class="size-3" />
                                            Settle
                                        </button>
                                    {/if}
                                </div>
                            {/if}
                        </td>
                        <td class="px-3 py-2">
                            {#if rule.status !== 'active'}
                                <span
                                    class="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 {rule.status === 'paused'
                                        ? 'bg-muted text-muted-foreground'
                                        : 'bg-destructive/10 text-destructive'}"
                                >
                                    {rule.status}
                                </span>
                            {:else}
                                <span class="text-muted-foreground">—</span>
                            {/if}
                        </td>
                        <td class="px-2 py-2 w-10">{@render kebabCell(rule)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/snippet}

{#snippet subscriptionTable(rows: Rule[])}
    <div class="rounded-[var(--radius-md)] border bg-card overflow-x-auto">
        <table class="w-full text-sm min-w-[580px] border-collapse">
            <thead class="bg-muted/40 border-b">
                <tr class="text-xs text-muted-foreground uppercase tracking-wide">
                    <th class="text-left font-medium px-3 py-2 sticky left-0 z-20 bg-muted/40 border-r w-[200px] min-w-[200px]">Name</th>
                    <th class="text-left font-medium px-3 py-2">Schedule</th>
                    <th class="text-right font-medium px-3 py-2">Amount</th>
                    <th class="text-left font-medium px-3 py-2">Next</th>
                    <th class="text-left font-medium px-3 py-2">Status</th>
                    <th class="w-10"></th>
                </tr>
            </thead>
            <tbody class="divide-y">
                {#each rows as rule (rule.id)}
                    <tr
                        role="button"
                        tabindex="0"
                        onclick={(e) => {
                            const t = e.target as HTMLElement;
                            if (t.closest('button, [role="menuitem"], [data-no-nav]')) return;
                            goto(`/vaults/${vaultId}/recurring/${rule.id}/edit`);
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                goto(`/vaults/${vaultId}/recurring/${rule.id}/edit`);
                            }
                        }}
                        class="group cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                        <td class="px-3 py-2 sticky left-0 z-10 bg-card group-hover:bg-muted/30 border-r w-[200px] min-w-[200px] max-w-[200px]">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="shrink-0" aria-hidden="true">{rule.template.icon ?? '🔁'}</span>
                                <span class="font-medium truncate" title={displayName(rule)}>{displayName(rule)}</span>
                            </div>
                        </td>
                        <td class="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {scheduleLabel(rule)}
                        </td>
                        <td class="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                            {fmt.currency(ruleAmount(rule))}
                        </td>
                        <td class="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {#if rule.nextOccurrenceAt && rule.status === 'active'}
                                {fmt.date(rule.nextOccurrenceAt)}
                            {:else}
                                <span class="text-muted-foreground">—</span>
                            {/if}
                        </td>
                        <td class="px-3 py-2">
                            {#if rule.status !== 'active'}
                                <span
                                    class="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 {rule.status === 'paused'
                                        ? 'bg-muted text-muted-foreground'
                                        : 'bg-destructive/10 text-destructive'}"
                                >
                                    {rule.status}
                                </span>
                            {:else}
                                <span class="text-muted-foreground">—</span>
                            {/if}
                        </td>
                        <td class="px-2 py-2 w-10">{@render kebabCell(rule)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/snippet}

{#snippet ruleRow(rule: Rule)}
    {@const isInstallment = rule.endAfterCount !== null}
    {@const stage = isInstallment ? installmentStage(rule) : null}
    <div
        role="button"
        tabindex="0"
        onclick={(e) => {
            // Only navigate if the click didn't land inside a button or menu item.
            const t = e.target as HTMLElement;
            if (t.closest('button, [role="menuitem"], [data-no-nav]')) return;
            goto(`/vaults/${vaultId}/recurring/${rule.id}/edit`);
        }}
        onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goto(`/vaults/${vaultId}/recurring/${rule.id}/edit`);
            }
        }}
        class="flex items-start gap-2 px-3 py-2 border-l-4 cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset {stage
            ? stageClass(stage)
            : 'border-l-transparent'}"
    >
        <div class="flex-1 min-w-0">
            <p class="font-medium break-words">
                <span class="mr-1.5" aria-hidden="true">{rule.template.icon ?? '🔁'}</span>
                {displayName(rule)}
                {#if rule.status !== 'active'}
                    <span
                        class="inline-flex items-center text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 align-middle ml-1.5 {rule.status === 'paused'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-destructive/10 text-destructive'}"
                    >
                        {rule.status}
                    </span>
                {/if}
                <span class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-mono tabular-nums align-middle ml-2">
                    {fmt.currency(ruleAmount(rule))}
                </span>
            </p>
            {#if isInstallment}
                {@const paid = rule.progress.paidCount}
                {@const total = rule.endAfterCount ?? 0}
                {@const totalAmt = rule.progress.totalAmount ?? 0}
                {@const paidAmt = rule.progress.paidAmount}
                {@const endedMeetsTarget = rule.status === 'ended' && totalAmt > 0 && paidAmt + 0.005 >= totalAmt}
                {@const endedEarly = rule.status === 'ended' && totalAmt > 0 && paidAmt + 0.005 < totalAmt && paid < total}
                {@const pct = endedMeetsTarget || endedEarly
                    ? 100
                    : Math.min(100, Math.round((paid / total) * 100))}
                {@const remaining = remainingAmount(rule)}
                {@const canSettle = rule.status === 'active' && remaining.value > 0}
                <p class="text-xs text-muted-foreground mt-0.5">
                    {#if endedMeetsTarget}
                        <span class="font-medium text-foreground">Settled in full</span>
                        <span class="opacity-50">·</span>
                        <span class="font-mono tabular-nums">{fmt.currency(paidAmt)}</span>
                    {:else if endedEarly}
                        {@const saved = totalAmt - paidAmt}
                        <span class="font-medium text-foreground">Settled early</span>
                        <span class="opacity-50">·</span>
                        <span class="font-mono tabular-nums">{fmt.currency(paidAmt)}</span>
                        <span>(saved <span class="font-mono">{fmt.currency(saved)}</span>)</span>
                    {:else}
                        {scheduleLabel(rule)}
                        <span class="opacity-50">·</span>
                        <span class="tabular-nums font-medium text-foreground">{paid}/{total}</span>
                        {#if remaining.value > 0}
                            <span class="opacity-50">·</span>
                            <span class="font-mono tabular-nums font-medium text-foreground">
                                {remaining.source === 'estimated' ? '~' : ''}{fmt.currency(remaining.value)}
                            </span>
                            <span>left</span>
                            {#if remaining.source === 'estimated'}
                                <span class="opacity-60" title="No declared total — estimated from per-period amount">est.</span>
                            {/if}
                        {/if}
                    {/if}
                </p>
                <div class="h-1 rounded-full bg-muted overflow-hidden mt-1.5">
                    <div
                        class="h-full rounded-full transition-all duration-500 bg-primary"
                        style="width: {pct}%"
                    ></div>
                </div>
                {#if canSettle}
                    <div class="mt-2">
                        <button
                            type="button"
                            data-no-nav
                            onclick={(e) => { e.stopPropagation(); askSettle(rule); }}
                            class="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                            <CircleCheck class="size-3" />
                            Settle <span class="font-mono">{fmt.currency(remaining.value)}</span>
                        </button>
                    </div>
                {/if}
            {:else}
                <p class="text-xs text-muted-foreground mt-0.5">
                    {scheduleLabel(rule)}
                    {#if rule.nextOccurrenceAt && rule.status === 'active'}
                        <span class="opacity-50">·</span>
                        Next {fmt.date(rule.nextOccurrenceAt)}
                    {/if}
                </p>
            {/if}
        </div>
        <div class="flex gap-0.5 shrink-0 items-center">
            {#if rule.status === 'paused'}
                <button
                    type="button"
                    onclick={(e) => {
                        e.stopPropagation();
                        handleResumeRule(rule);
                    }}
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
                <DropdownMenu.Content align="end" class="min-w-[13rem]">
                    <DropdownMenu.Item
                        disabled={atRecurringLimit}
                        onclick={() => goto(`/vaults/${vaultId}/recurring/new?duplicateFrom=${rule.id}`)}
                    >
                        <Copy class="size-3.5" />
                        <span>Duplicate{atRecurringLimit ? ' (Pro)' : ''}</span>
                    </DropdownMenu.Item>
                    {#if rule.status === 'active'}
                        <DropdownMenu.Separator />
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
                    <DropdownMenu.Separator />
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
    {@const remainingCount = (rule.endAfterCount ?? 0) - rule.progress.paidCount}
    {@const outstanding = remainingAmount(rule)}
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
                        {remainingCount} period{remainingCount === 1 ? '' : 's'} remaining ·
                        outstanding
                        <span class="font-mono text-foreground">{fmt.currency(outstanding.value)}</span>
                        <span class="opacity-60">({outstanding.source})</span>
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
