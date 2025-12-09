<script lang="ts">
    type FilterType = 'template' | 'category' | 'member';

    type FilterOption = {
        icon: string;
        name: string;
    };

    type Props = {
        filterType: FilterType;
        filterName: string;
        filterOptions: FilterOption[];
        onClear: () => void;
    };

    let {filterType, filterName, filterOptions, onClear}: Props = $props();

    function getIcon(): string {
        switch (filterType) {
            case 'template':
                return filterOptions.find(opt => opt.name === filterName)?.icon || '📝';
            case 'category':
                return '🏷️';
            case 'member':
                return '👤';
            default:
                return '📋';
        }
    }
</script>

{#if filterName}
    <div class="mb-4">
        <p class="text-xs text-muted-foreground mb-2">Filtered by:</p>
        <div class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <span class="text-sm">{getIcon()}</span>
            <span class="text-sm font-medium">{filterName}</span>
            <button
                type="button"
                onclick={onClear}
                class="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                aria-label="Clear filter"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>
    </div>
{/if}
