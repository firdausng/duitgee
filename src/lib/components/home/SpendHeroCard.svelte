<script lang="ts" module>
    import type { DateFilter } from '$lib/utils';

    export type SpendHeroCardProps = {
        filterType: DateFilter;
        currentAmount: number;
        currentCount: number;
        priorAmount: number | null;
        loading?: boolean;
        onFilterChange: (filter: DateFilter) => void;
        formatCurrency: (amount: number) => string;
    };
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import { periodLabel, priorPeriodLabel } from '$lib/utils';
    import TrendingUp from '@lucide/svelte/icons/trending-up';
    import TrendingDown from '@lucide/svelte/icons/trending-down';
    import Minus from '@lucide/svelte/icons/minus';

    let {
        filterType,
        currentAmount,
        currentCount,
        priorAmount,
        loading = false,
        onFilterChange,
        formatCurrency,
    }: SpendHeroCardProps = $props();

    type Tab = { id: DateFilter; label: string };
    const tabs: Tab[] = [
        { id: 'today', label: 'Today' },
        { id: 'week', label: 'Week' },
        { id: 'month', label: 'Month' },
        { id: 'year', label: 'Year' },
    ];

    const period = $derived(periodLabel(filterType));
    const priorLabel = $derived(priorPeriodLabel(filterType));

    // Delta = (current - prior) / prior; positive means *spent more* (negative for budget).
    const delta = $derived.by(() => {
        if (priorAmount == null) return null;
        if (priorAmount === 0) {
            // No spend last period → emit a category instead of a percent
            return currentAmount === 0
                ? { kind: 'flat' as const }
                : { kind: 'new' as const };
        }
        const ratio = (currentAmount - priorAmount) / priorAmount;
        return { kind: 'pct' as const, ratio, abs: currentAmount - priorAmount };
    });
</script>

<section class="dg-spend border bg-card p-4 sm:p-5">
    <!-- Period chips — mono uppercase, square, oxblood active -->
    <div class="dg-spend__tabs">
        {#each tabs as tab (tab.id)}
            {@const active = filterType === tab.id}
            <button
                type="button"
                onclick={() => onFilterChange(tab.id)}
                class={cn('dg-spend__tab', active && 'is-active')}
            >
                {tab.label}
            </button>
        {/each}
        {#if filterType === 'custom' || filterType === 'all' || filterType === 'yesterday' || filterType === 'last7' || filterType === 'last30' || filterType === 'last90'}
            <span class="dg-spend__tab dg-spend__tab--passive">{period}</span>
        {/if}
    </div>

    <!-- Period eyebrow -->
    <p class="dg-spend__eyebrow">
        — {period}{currentCount > 0 ? ` · ${currentCount} ${currentCount === 1 ? 'entry' : 'entries'}` : ''} —
    </p>

    <!-- Big amount in oxblood Fraunces tnum -->
    <p class={cn('dg-spend__amount', loading && 'opacity-40')}>
        {formatCurrency(currentAmount)}
    </p>

    <!-- Delta -->
    {#if delta}
        <div class="mt-2.5 flex items-center gap-1.5 text-xs">
            {#if delta.kind === 'pct'}
                {@const up = delta.ratio > 0}
                {@const flat = Math.abs(delta.ratio) < 0.001}
                {#if flat}
                    <Minus class="size-3.5 text-muted-foreground" />
                    <span class="text-muted-foreground">No change vs {priorLabel}</span>
                {:else if up}
                    <TrendingUp class="size-3.5 text-[var(--amount-negative,theme(colors.rose.500))]" />
                    <span class="font-medium tabular-nums">
                        +{formatCurrency(Math.abs(delta.abs))}
                        <span class="text-muted-foreground font-normal">
                            ({(delta.ratio * 100).toFixed(0)}%) vs {priorLabel}
                        </span>
                    </span>
                {:else}
                    <TrendingDown class="size-3.5 text-[var(--amount-positive,theme(colors.emerald.500))]" />
                    <span class="font-medium tabular-nums">
                        −{formatCurrency(Math.abs(delta.abs))}
                        <span class="text-muted-foreground font-normal">
                            ({Math.abs(delta.ratio * 100).toFixed(0)}%) vs {priorLabel}
                        </span>
                    </span>
                {/if}
            {:else if delta.kind === 'new'}
                <span class="text-muted-foreground">Nothing recorded {priorLabel}</span>
            {:else}
                <Minus class="size-3.5 text-muted-foreground" />
                <span class="text-muted-foreground">No change vs {priorLabel}</span>
            {/if}
        </div>
    {:else if filterType !== 'all'}
        <p class="mt-2.5 text-xs text-muted-foreground italic">Calculating comparison…</p>
    {/if}
</section>

<style>
    /* Almanac SpendHeroCard polish — paper plate, mono pills, italic Fraunces amount */

    .dg-spend {
        border-color: var(--almanac-ink);
    }

    .dg-spend__tabs {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-bottom: 0.85rem;
        overflow-x: auto;
    }
    .dg-spend__tabs::-webkit-scrollbar { display: none; }

    .dg-spend__tab {
        flex-shrink: 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--almanac-ink-3);
        background: transparent;
        border: 1px solid transparent;
        padding: 0.3rem 0.7rem;
        cursor: pointer;
        transition: color 150ms;
    }
    .dg-spend__tab:hover { color: var(--almanac-ink); }
    .dg-spend__tab.is-active {
        background: var(--almanac-oxblood);
        color: var(--almanac-paper);
        border-color: var(--almanac-oxblood);
    }
    .dg-spend__tab--passive {
        background: var(--almanac-paper-2);
        color: var(--almanac-ink-2);
        border-color: var(--almanac-rule-soft);
    }

    .dg-spend__eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--almanac-ink-3);
        margin: 0 0 0.5rem;
    }

    .dg-spend__amount {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 30, 'wght' 380;
        font-feature-settings: 'tnum';
        font-size: clamp(2rem, 5vw, 2.8rem);
        line-height: 1;
        letter-spacing: -0.02em;
        color: var(--almanac-oxblood);
        margin: 0;
    }
</style>
