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

<section class="rounded-[var(--radius-md)] border bg-card p-4 sm:p-5">
    <!-- Period chips -->
    <div class="flex items-center gap-1 mb-3 -mx-1 overflow-x-auto scrollbar-hide">
        {#each tabs as tab (tab.id)}
            {@const active = filterType === tab.id}
            <button
                type="button"
                onclick={() => onFilterChange(tab.id)}
                class={cn(
                    'shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted',
                )}
            >
                {tab.label}
            </button>
        {/each}
        {#if filterType === 'custom' || filterType === 'all' || filterType === 'yesterday' || filterType === 'last7' || filterType === 'last30' || filterType === 'last90'}
            <span class="shrink-0 ml-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                {period}
            </span>
        {/if}
    </div>

    <!-- Period label -->
    <p class="text-xs text-muted-foreground mb-1">
        {period}{currentCount > 0 ? ` · ${currentCount} ${currentCount === 1 ? 'expense' : 'expenses'}` : ''}
    </p>

    <!-- Big amount -->
    <p
        class={cn(
            'font-mono tabular-nums leading-none tracking-tight',
            'text-3xl sm:text-4xl font-bold',
            loading && 'opacity-40',
        )}
    >
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
        <p class="mt-2.5 text-xs text-muted-foreground">Calculating comparison…</p>
    {/if}
</section>
