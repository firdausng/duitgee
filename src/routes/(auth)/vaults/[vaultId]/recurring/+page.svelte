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

    async function handleDeleteRule(rule: Rule) {
        if (!confirm(`Delete recurring rule "${displayName(rule)}"? This cannot be undone.`)) return;
        try {
            await ofetch('/api/deleteRecurringExpense', {
                method: 'POST',
                body: { vaultId, id: rule.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Rule deleted');
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to delete');
        }
    }

    function displayName(rule: Rule): string {
        return rule.name || rule.template.name || 'Recurring rule';
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
                                <button
                                    type="button"
                                    onclick={() => handleSkipPending(occ)}
                                    class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground"
                                    aria-label="Skip"
                                    title="Skip"
                                >
                                    <X class="size-4" />
                                </button>
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

        <!-- Rules -->
        <section>
            <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Rules ({rules.length})
            </h2>
            {#if rules.length === 0}
                <Card>
                    <CardContent class="py-10">
                        <EmptyState
                            icon={RefreshCw}
                            title="No recurring rules yet"
                            description="Create a rule to automate repeating expenses like rent, subscriptions, or allowances."
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
            {:else}
                <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                    {#each rules as rule (rule.id)}
                        <div class="flex items-start gap-3 px-3 py-2.5">
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
                                    {@const pct = Math.min(100, Math.round((paid / total) * 100))}
                                    {@const remaining = total - paid}
                                    <div class="mt-1.5 space-y-1">
                                        <p class="text-xs">
                                            <span class="font-medium tabular-nums">{paid} of {total} paid</span>
                                            <span class="text-muted-foreground"> · </span>
                                            <span class="font-mono tabular-nums">{fmt.currency(rule.progress.paidAmount)}</span>
                                            {#if rule.progress.totalAmount !== null}
                                                <span class="text-muted-foreground">of</span>
                                                <span class="font-mono tabular-nums">{fmt.currency(rule.progress.totalAmount)}</span>
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
                                            {:else if remaining === 0}
                                                Complete
                                            {/if}
                                            {#if rule.progress.finalOccurrenceAt}
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
                                {#if rule.status === 'active'}
                                    <button
                                        type="button"
                                        onclick={() => handleSkipNext(rule)}
                                        class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground"
                                        aria-label="Skip next"
                                        title="Skip next occurrence"
                                    >
                                        <SkipForward class="size-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onclick={() => handlePauseRule(rule)}
                                        class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground"
                                        aria-label="Pause"
                                        title="Pause"
                                    >
                                        <Pause class="size-3.5" />
                                    </button>
                                {:else if rule.status === 'paused'}
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
                                <button
                                    type="button"
                                    onclick={() => handleDeleteRule(rule)}
                                    class="p-1.5 rounded-[var(--radius-sm)] hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    aria-label="Delete"
                                    title="Delete"
                                >
                                    <Trash2 class="size-3.5" />
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>
    {/if}
</div>

<Toaster />
