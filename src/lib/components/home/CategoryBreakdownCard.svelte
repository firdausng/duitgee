<script lang="ts" module>
    export type CategoryBreakdownCardCategory = {
        categoryName: string;
        categoryIcon?: string;
        categoryIconType?: string;
        totalAmount: number;
        count: number;
    };

    export type CategoryBreakdownCardProps = {
        vaultId: string;
        categories: CategoryBreakdownCardCategory[];
        loading?: boolean;
        formatCurrency: (amount: number) => string;
        /** Forwarded to /statistics when a row is clicked. */
        currentSearch?: string;
    };
</script>

<script lang="ts">
    import { goto } from '$app/navigation';
    import { BreakdownBars, type BreakdownRow } from '$lib/components/ui/breakdown-bars';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import PieChart from '@lucide/svelte/icons/pie-chart';

    let {
        vaultId,
        categories,
        loading = false,
        formatCurrency,
        currentSearch = '',
    }: CategoryBreakdownCardProps = $props();

    const rows = $derived<BreakdownRow[]>(
        categories.map((c) => ({
            id: c.categoryName,
            label: c.categoryName,
            icon: c.categoryIcon ?? null,
            iconType: c.categoryIconType ?? null,
            value: c.totalAmount,
            count: c.count,
        })),
    );

    const total = $derived(rows.reduce((sum, r) => sum + r.value, 0));

    function handleSelect(row: BreakdownRow) {
        const params = new URLSearchParams(currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch);
        params.set('filterType', 'category');
        params.set('filterName', row.label);
        goto(`/vaults/${vaultId}/statistics?${params.toString()}`);
    }

    function viewAll() {
        const search = currentSearch.startsWith('?') ? currentSearch : currentSearch ? `?${currentSearch}` : '';
        goto(`/vaults/${vaultId}/statistics${search}`);
    }
</script>

<section class="dg-cb space-y-2">
    <div class="flex items-end justify-between px-1 gap-2">
        <div class="min-w-0">
            <p class="dg-cb__eyebrow">— Where it went —</p>
            {#if total > 0}
                <p class="dg-cb__total"><em>{formatCurrency(total)}</em> across the period</p>
            {/if}
        </div>
        <button type="button" onclick={viewAll} class="dg-cb__link">
            View all <ArrowRight class="size-3" />
        </button>
    </div>

    {#if loading}
        <div class="rounded-[var(--radius-md)] border bg-card p-4 space-y-2">
            {#each Array(3) as _, i (i)}
                <div class="h-8 rounded animate-pulse bg-muted/50"></div>
            {/each}
        </div>
    {:else if rows.length === 0}
        <div class="rounded-[var(--radius-md)] border bg-card flex flex-col items-center justify-center text-center py-6 px-4">
            <PieChart class="size-6 text-muted-foreground mb-2" />
            <p class="text-sm text-muted-foreground">
                No spending in this period yet.
            </p>
        </div>
    {:else}
        <BreakdownBars
            {rows}
            limit={5}
            {formatCurrency}
            onSelect={handleSelect}
        />
    {/if}
</section>

<style>
    .dg-cb__eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.68rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--almanac-ink-3);
        margin: 0;
    }
    .dg-cb__total {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.85rem;
        color: var(--almanac-ink-2);
        margin: 0.2rem 0 0;
    }
    .dg-cb__total em {
        font-family: 'JetBrains Mono', monospace;
        font-style: normal;
        color: var(--almanac-oxblood);
        font-feature-settings: 'tnum';
    }
    .dg-cb__link {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.85rem;
        color: var(--almanac-oxblood);
        text-decoration: underline;
        text-underline-offset: 3px;
        background: none;
        border: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        flex-shrink: 0;
        padding: 0;
    }
</style>
