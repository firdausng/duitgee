<script lang="ts" module>
    export type CategoryBreakdownCardCategory = {
        categoryName: string;
        categoryIcon?: string;
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

<section class="space-y-2">
    <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2 min-w-0">
            <h2 class="text-sm font-semibold text-muted-foreground">Where it went</h2>
            {#if total > 0}
                <span class="text-xs text-muted-foreground whitespace-nowrap">
                    · <span class="font-mono">{formatCurrency(total)}</span>
                </span>
            {/if}
        </div>
        <button
            type="button"
            onclick={viewAll}
            class="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
        >
            View all
            <ArrowRight class="size-3" />
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
