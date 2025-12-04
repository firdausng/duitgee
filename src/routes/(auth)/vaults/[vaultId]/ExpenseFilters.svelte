<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { slide, scale } from "svelte/transition";

    type FilterType = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

    type Props = {
        filterType: FilterType;
        startDate: string;
        endDate: string;
        onFilterChange: (filter: FilterType) => void;
        onApplyCustomFilter: () => void;
        onStartDateChange: (value: string) => void;
        onEndDateChange: (value: string) => void;
    };

    let {
        filterType,
        startDate,
        endDate,
        onFilterChange,
        onApplyCustomFilter,
        onStartDateChange,
        onEndDateChange
    }: Props = $props();
</script>

<div class="mb-6 pb-4 border-b">
    <div class="space-y-3">
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
                class="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 {filterType === 'today' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                onclick={() => onFilterChange('today')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                </svg>
                Today
            </button>
            <button
                class="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 {filterType === 'week' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                onclick={() => onFilterChange('week')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                </svg>
                Week
            </button>
            <button
                class="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 {filterType === 'month' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                onclick={() => onFilterChange('month')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                </svg>
                Month
            </button>
            <button
                class="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 {filterType === 'year' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                onclick={() => onFilterChange('year')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                </svg>
                Year
            </button>
            <button
                class="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 {filterType === 'custom' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                onclick={() => onFilterChange('custom')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                </svg>
                Custom
            </button>
            <button
                class="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 {filterType === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
                onclick={() => onFilterChange('all')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" />
                </svg>
                All
            </button>
        </div>

        <!-- Custom Date Range -->
        {#if filterType === 'custom'}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12" transition:slide={{ duration: 300 }}>
                <div class="space-y-1.5">
                    <Label for="startDate" class="text-xs">Start Date & Time</Label>
                    <Input
                        id="startDate"
                        type="datetime-local"
                        value={startDate}
                        oninput={(e) => onStartDateChange(e.currentTarget.value)}
                        class="h-9 text-sm"
                    />
                </div>
                <div class="space-y-1.5">
                    <Label for="endDate" class="text-xs">End Date & Time</Label>
                    <Input
                        id="endDate"
                        type="datetime-local"
                        value={endDate}
                        oninput={(e) => onEndDateChange(e.currentTarget.value)}
                        class="h-9 text-sm"
                    />
                </div>
                <div class="md:col-span-2">
                    <Button onclick={onApplyCustomFilter} size="sm">
                        Apply Filter
                    </Button>
                </div>
            </div>
        {/if}
    </div>
</div>
