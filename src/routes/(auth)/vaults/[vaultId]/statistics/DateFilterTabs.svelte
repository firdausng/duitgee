<script lang="ts">
    import {cn} from "$lib/utils";

    // Accept the full DateFilter type so existing callers (that may still
    // carry 'custom' / 'all' in state) type-check cleanly; we just don't
    // render buttons for those removed options.
    import type { DateFilter as AppDateFilter } from '$lib/utils';
    type VisibleFilter = 'today' | 'yesterday' | 'week' | 'month' | 'year';

    type Props = {
        currentFilter: AppDateFilter;
        onFilterChange: (filter: AppDateFilter) => void;
    };

    let {currentFilter, onFilterChange}: Props = $props();

    const filters: { value: VisibleFilter; label: string }[] = [
        {value: 'today', label: 'Today'},
        {value: 'yesterday', label: 'Yesterday'},
        {value: 'week', label: 'This Week'},
        {value: 'month', label: 'This Month'},
        {value: 'year', label: 'This Year'},
    ];
</script>

<div class="flex gap-2 mb-2 overflow-x-auto pb-2">
    {#each filters as filter}
        <button
            type="button"
            onclick={() => onFilterChange(filter.value)}
            class={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                currentFilter === filter.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
            )}
        >
            {filter.label}
        </button>
    {/each}
</div>
