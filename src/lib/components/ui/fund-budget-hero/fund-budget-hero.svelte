<script lang="ts" module>
    import type { CycleLike, FundLike, FundSummary, PolicyLike } from '$lib/utils/fund-summary';

    export interface FundBudgetHeroProps {
        fund: FundLike;
        cycle: CycleLike | null | undefined;
        policy: PolicyLike | null | undefined;
        /** Vault-aware currency formatter, e.g. `fmt.currency`. */
        formatCurrency: (amount: number) => string;
        class?: string;
    }
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import { computeFundSummary } from '$lib/utils/fund-summary';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';

    let { fund, cycle, policy, formatCurrency, class: className }: FundBudgetHeroProps = $props();

    const summary = $derived(computeFundSummary(fund, cycle, policy));

    // Progress bar color
    const barColor = $derived.by<string>(() => {
        const p = summary.percentUsed ?? 0;
        if (p >= 1) return 'var(--amount-negative)';
        if (p >= 0.9) return 'var(--accent-strong)';
        return 'var(--primary)';
    });

    const projectionLabel = $derived.by<string | null>(() => {
        if (summary.isManual) return null;
        if (summary.projectedSpend == null) return null;
        const over = summary.projectedOver;
        const phrase = `on track to spend ${formatCurrency(summary.projectedSpend)} by cycle end`;
        return over ? `⚠ ${phrase}` : phrase;
    });

    const earlyCycleNotice = $derived.by(() => {
        if (summary.isManual) return null;
        if (summary.projectedSpend != null) return null;
        if (summary.daysElapsed == null) return null;
        if (summary.daysElapsed < 3) return 'Too early to project — check back in a few days.';
        return null;
    });

    const cyclePeriod = $derived.by(() => {
        if (summary.isManual || !cycle) return null;
        try {
            const start = new Date(cycle.periodStart).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
            });
            const end = new Date(cycle.periodEnd).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
            return `${start} — ${end}`;
        } catch {
            return null;
        }
    });
</script>

<div
    class={cn(
        'rounded-[var(--radius-md)] border bg-card p-4 space-y-3',
        className,
    )}
>
    <!-- Header row: period + days-left -->
    <div class="flex items-baseline justify-between gap-2">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {#if summary.isManual}
                Manual fund · lifetime
            {:else}
                This cycle {#if cyclePeriod}· <span class="text-muted-foreground/70 normal-case font-normal">{cyclePeriod}</span>{/if}
            {/if}
        </p>
        {#if !summary.isManual && summary.daysLeft != null}
            <span class="text-xs text-muted-foreground whitespace-nowrap">
                {summary.daysLeft} {summary.daysLeft === 1 ? 'day' : 'days'} left
            </span>
        {/if}
    </div>

    <!-- Spent vs Budget line -->
    <div class="flex items-baseline justify-between gap-3">
        <div class="min-w-0">
            <p class="text-xs text-muted-foreground mb-0.5">Spent</p>
            <p class="font-mono text-2xl font-semibold tabular-nums" style="color: {summary.spent > 0 ? 'var(--amount-negative)' : 'var(--amount-neutral)'};">
                {formatCurrency(summary.spent)}
            </p>
        </div>
        {#if !summary.isManual}
            <div class="text-right">
                <p class="text-xs text-muted-foreground mb-0.5">Budget</p>
                <p class="font-mono text-lg tabular-nums">
                    {formatCurrency(summary.budget)}
                </p>
            </div>
        {/if}
    </div>

    <!-- Progress bar (scheduled funds only) -->
    {#if !summary.isManual && summary.percentUsed != null}
        <div>
            <div class="h-2 rounded-full bg-muted overflow-hidden">
                <div
                    class="h-full rounded-full transition-all duration-500"
                    style="width: {(summary.percentUsed * 100).toFixed(1)}%; background: {barColor};"
                ></div>
            </div>
            <p class="text-xs text-muted-foreground mt-1.5 tabular-nums">
                {(summary.percentUsed * 100).toFixed(0)}% used
                {#if projectionLabel}
                    · <span class:text-[color:var(--amount-negative)]={summary.projectedOver}>{projectionLabel}</span>
                {:else if earlyCycleNotice}
                    · {earlyCycleNotice}
                {/if}
            </p>
        </div>
    {/if}

    <!-- Manual fund: current balance as secondary stat -->
    {#if summary.isManual}
        <div class="flex items-baseline justify-between pt-1 border-t">
            <p class="text-sm text-muted-foreground">Current balance</p>
            <p class="font-mono text-lg font-semibold tabular-nums">
                {formatCurrency(fund.balance)}
            </p>
        </div>
    {/if}

    <!-- Breakdown disclosure (the old Current Cycle table, now on demand) -->
    {#if cycle && !summary.isManual}
        <details class="group">
            <summary class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer list-none select-none">
                <ChevronDown class="size-3.5 transition-transform group-open:rotate-180" />
                Breakdown
            </summary>
            <div class="mt-2 space-y-1 text-xs font-mono tabular-nums border-t pt-2">
                <div class="flex justify-between">
                    <span class="text-muted-foreground font-sans">Opening</span>
                    <span>{formatCurrency(cycle.openingBalance ?? 0)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-muted-foreground font-sans">Top-ups</span>
                    <span style="color: var(--amount-positive);">+{formatCurrency(cycle.topUpAmount ?? 0)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-muted-foreground font-sans">Expenses</span>
                    <span style="color: var(--amount-negative);">−{formatCurrency(cycle.totalSpent ?? 0)}</span>
                </div>
                {#if (cycle.totalDeducted ?? 0) > 0}
                    <div class="flex justify-between">
                        <span class="text-muted-foreground font-sans">Deductions</span>
                        <span style="color: var(--amount-negative);">−{formatCurrency(cycle.totalDeducted ?? 0)}</span>
                    </div>
                {/if}
                {#if (cycle.totalReimbursed ?? 0) > 0}
                    <div class="flex justify-between">
                        <span class="text-muted-foreground font-sans">Reimbursed</span>
                        <span style="color: var(--amount-positive);">+{formatCurrency(cycle.totalReimbursed ?? 0)}</span>
                    </div>
                {/if}
                <div class="flex justify-between pt-1 border-t">
                    <span class="text-muted-foreground font-sans font-medium">Balance</span>
                    <span class="font-semibold">{formatCurrency(fund.balance)}</span>
                </div>
            </div>
        </details>
    {/if}
</div>

<style>
    details > summary::-webkit-details-marker {
        display: none;
    }
</style>
