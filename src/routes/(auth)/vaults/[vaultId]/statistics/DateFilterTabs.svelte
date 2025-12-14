<script lang="ts">
    import {cn} from "$lib/utils";

    type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';

    type Props = {
        currentFilter: DateFilter;
        onFilterChange: (filter: DateFilter) => void;
    };

    let {currentFilter, onFilterChange}: Props = $props();

    const filters: { value: DateFilter; label: string }[] = [
        {value: 'today', label: 'Today'},
        {value: 'week', label: 'This Week'},
        {value: 'month', label: 'This Month'},
        {value: 'year', label: 'This Year'},
        {value: 'all', label: 'All Time'},
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
