<script lang="ts">
    import {cn} from "$lib/utils";

    type FilterType = 'template' | 'category' | 'member';

    type Props = {
        currentType: FilterType;
        onTypeChange: (type: FilterType) => void;
    };

    let {currentType, onTypeChange}: Props = $props();

    const filterTypes = [
        {
            value: 'category' as FilterType,
            label: 'Category',
            icon: 'M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z'
        },
        {
            value: 'template' as FilterType,
            label: 'Template',
            icon: 'M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z'
        },
        {
            value: 'member' as FilterType,
            label: 'Member',
            icon: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z'
        }
    ];
</script>

<div class="flex gap-2 mb-2 border-b">
    {#each filterTypes as filterType}
        <button
            type="button"
            onclick={() => onTypeChange(filterType.value)}
            class={cn(
                "px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                currentType === filterType.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
            )}
        >
            <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d={filterType.icon} clip-rule="evenodd" />
                </svg>
                {filterType.label}
            </div>
        </button>
    {/each}
</div>
