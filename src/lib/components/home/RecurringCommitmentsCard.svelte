<script lang="ts" module>
    import type { RecurringRule } from '$lib/recurring-helpers';

    export type RecurringCommitmentsUpcoming = {
        ruleId: string;
        ruleName: string | null;
        templateName: string | null;
        templateIcon: string | null;
        amount: number;
        dueDate: string;
    };

    export type RecurringCommitmentsCardProps = {
        vaultId: string;
        rules: RecurringRule[];
        upcoming: RecurringCommitmentsUpcoming[];
        loading?: boolean;
        formatCurrency: (amount: number) => string;
    };
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import {
        subscriptionSummary,
        installmentSummary,
        topInstallmentsAlmostFinished,
        remainingAmount,
    } from '$lib/recurring-helpers';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

    let {
        vaultId,
        rules,
        upcoming,
        loading = false,
        formatCurrency,
    }: RecurringCommitmentsCardProps = $props();

    const subs = $derived(subscriptionSummary(rules));
    const inst = $derived(installmentSummary(rules));
    const totalMonthly = $derived(subs.monthlyCommit + inst.monthlyCommit);
    const totalActive = $derived(subs.active + inst.active);
    const dueThisWeek = $derived(upcoming.length);
    const top3Upcoming = $derived(upcoming.slice(0, 3));
    const almostFinished = $derived(topInstallmentsAlmostFinished(rules, 2));

    function formatEndDate(iso: string | null): string {
        if (!iso) return '';
        const d = new Date(iso);
        const now = new Date();
        const sameYear = d.getFullYear() === now.getFullYear();
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: sameYear ? undefined : 'numeric',
        });
    }

    // Render nothing when there's nothing to summarize. Prevents the dashboard
    // from showing an empty "Recurring" shell on vaults that don't use the feature.
    const hasContent = $derived(totalActive > 0 || dueThisWeek > 0);

    function formatDueDate(iso: string): string {
        const d = new Date(iso);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const sameDay = (a: Date, b: Date) =>
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();

        if (sameDay(d, today)) return 'Today';
        if (sameDay(d, tomorrow)) return 'Tomorrow';
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
</script>

{#if hasContent}
    <section class="rounded-[var(--radius-md)] border bg-card overflow-hidden">
        <div class="px-3 sm:px-4 py-2.5 border-b flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
                <RotateCcw class="size-4 text-muted-foreground shrink-0" />
                <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recurring commitments
                </p>
            </div>
            <a
                href="/vaults/{vaultId}/recurring"
                class="text-xs font-medium text-primary hover:underline flex items-center gap-0.5 shrink-0"
            >
                View all
                <ArrowRight class="size-3" />
            </a>
        </div>

        <div class="p-3 sm:p-4 space-y-3">
            <!-- Headline -->
            <div>
                <p
                    class={cn(
                        'font-mono tabular-nums leading-none tracking-tight',
                        'text-2xl sm:text-3xl font-bold',
                        loading && 'opacity-40',
                    )}
                >
                    {formatCurrency(totalMonthly)}<span class="text-base text-muted-foreground font-normal">/mo</span>
                </p>
                <p class="text-xs text-muted-foreground mt-1.5">
                    {#if subs.active > 0}
                        {subs.active} {subs.active === 1 ? 'subscription' : 'subscriptions'}
                    {/if}
                    {#if subs.active > 0 && inst.active > 0} · {/if}
                    {#if inst.active > 0}
                        {inst.active} active {inst.active === 1 ? 'installment' : 'installments'}
                    {/if}
                    {#if dueThisWeek > 0}
                        {#if subs.active > 0 || inst.active > 0} · {/if}
                        <span class="text-foreground font-medium">{dueThisWeek} due this week</span>
                    {/if}
                </p>
            </div>

            <!-- Upcoming preview -->
            {#if top3Upcoming.length > 0}
                <div class="border-t -mx-3 sm:-mx-4 px-3 sm:px-4 pt-3">
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Upcoming
                    </p>
                    <ul class="space-y-1">
                        {#each top3Upcoming as occ (occ.ruleId + occ.dueDate)}
                            <li class="flex items-center gap-2 text-sm">
                                <span class="text-base leading-none shrink-0" aria-hidden="true">
                                    {occ.templateIcon ?? '📅'}
                                </span>
                                <span class="flex-1 min-w-0 truncate">
                                    {occ.ruleName ?? occ.templateName ?? 'Recurring expense'}
                                </span>
                                <span class="text-xs text-muted-foreground tabular-nums whitespace-nowrap shrink-0">
                                    {formatDueDate(occ.dueDate)}
                                </span>
                                <span class="font-mono tabular-nums text-sm whitespace-nowrap shrink-0 ml-1">
                                    {formatCurrency(occ.amount)}
                                </span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}

            <!-- Installment progress strip + almost-finished detail rows -->
            {#if inst.totalAmount > 0}
                <div class="border-t -mx-3 sm:-mx-4 px-3 sm:px-4 pt-3">
                    <div class="flex items-baseline justify-between gap-2 mb-1.5">
                        <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Installments
                        </p>
                        <p class="text-xs text-muted-foreground tabular-nums">
                            {formatCurrency(inst.paidAmount)} / {formatCurrency(inst.totalAmount)}
                            <span class="ml-1 font-medium text-foreground">{inst.pct}%</span>
                        </p>
                    </div>
                    <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                            class="h-full rounded-full bg-primary transition-all"
                            style="width: {Math.min(100, Math.max(0, inst.pct))}%;"
                        ></div>
                    </div>

                    {#if almostFinished.length > 0}
                        {@const showLabel = almostFinished.length > 1 || (inst.active > 1)}
                        {#if showLabel}
                            <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-3 mb-1.5">
                                Almost finished
                            </p>
                        {:else}
                            <div class="mt-3"></div>
                        {/if}
                        <ul class="space-y-1.5">
                            {#each almostFinished as rule (rule.id)}
                                {@const total = rule.endAfterCount ?? 0}
                                {@const paid = rule.progress.paidCount}
                                {@const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0}
                                {@const endLabel = formatEndDate(rule.progress.finalOccurrenceAt)}
                                {@const remaining = remainingAmount(rule)}
                                {@const remainingLabel = remaining.value > 0
                                    ? `${remaining.source === 'estimated' ? '~' : ''}${formatCurrency(remaining.value)} left`
                                    : 'done'}
                                <li>
                                    <div class="flex items-center gap-2 text-sm">
                                        <span class="text-base leading-none shrink-0" aria-hidden="true">
                                            {rule.template.icon ?? '📦'}
                                        </span>
                                        <span class="flex-1 min-w-0 truncate">
                                            {rule.name ?? rule.template.name ?? 'Installment'}
                                        </span>
                                        <span class="font-mono tabular-nums text-sm font-medium whitespace-nowrap shrink-0">
                                            {remainingLabel}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-[11px] text-muted-foreground tabular-nums shrink-0">
                                            {paid}/{total}
                                        </span>
                                        <div class="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                            <div
                                                class={cn(
                                                    'h-full rounded-full transition-all',
                                                    pct >= 75
                                                        ? 'bg-[var(--amount-positive,theme(colors.emerald.500))]'
                                                        : 'bg-primary/70',
                                                )}
                                                style="width: {pct}%;"
                                            ></div>
                                        </div>
                                        {#if endLabel}
                                            <span class="text-[11px] text-muted-foreground tabular-nums shrink-0">
                                                ends {endLabel}
                                            </span>
                                        {/if}
                                    </div>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            {/if}
        </div>
    </section>
{/if}
