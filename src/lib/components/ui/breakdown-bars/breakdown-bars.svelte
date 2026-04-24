<script lang="ts" module>
    export interface BreakdownRow {
        id: string | null;
        label: string;
        icon?: string | null;
        /** Iconography color — used to tint the bar. Falls back to chart palette by index. */
        color?: string | null;
        value: number;
        count: number;
    }

    export interface BreakdownBarsProps {
        rows: BreakdownRow[];
        /** Max rows to show before requiring "See all". Default 5. */
        limit?: number;
        /** Called when a row is clicked. */
        onSelect?: (row: BreakdownRow) => void;
        formatCurrency: (amount: number) => string;
        /** Empty-state title. */
        emptyTitle?: string;
        class?: string;
    }
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';
    import ChevronUp from '@lucide/svelte/icons/chevron-up';
    import Inbox from '@lucide/svelte/icons/inbox';

    let {
        rows,
        limit = 5,
        onSelect,
        formatCurrency,
        emptyTitle = 'No data for this range.',
        class: className,
    }: BreakdownBarsProps = $props();

    let expanded = $state(false);

    // Sort by value desc and compute max for bar scaling.
    const sorted = $derived([...rows].sort((a, b) => b.value - a.value));
    const max = $derived(sorted.length > 0 ? sorted[0].value : 0);
    const visibleRows = $derived(expanded ? sorted : sorted.slice(0, limit));
    const hiddenCount = $derived(Math.max(0, sorted.length - limit));

    function paletteColor(index: number): string {
        const colors = [
            'var(--chart-1)',
            'var(--chart-2)',
            'var(--chart-3)',
            'var(--chart-4)',
            'var(--chart-5)',
            'var(--chart-6)',
        ];
        return colors[index % colors.length];
    }
</script>

<div class={cn('rounded-[var(--radius-md)] border bg-card', className)}>
    {#if sorted.length === 0}
        <div class="flex flex-col items-center justify-center text-center py-8 px-4">
            <Inbox class="size-6 text-muted-foreground mb-2" />
            <p class="text-sm text-muted-foreground">{emptyTitle}</p>
        </div>
    {:else}
        <div class="p-2 space-y-0.5">
            {#each visibleRows as row, i (row.id ?? row.label)}
                {@const pct = max > 0 ? (row.value / max) * 100 : 0}
                {@const barColor = row.color || paletteColor(i)}
                <button
                    type="button"
                    onclick={() => onSelect?.(row)}
                    class="group w-full text-left px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-muted/60 transition-colors"
                >
                    <div class="flex items-baseline justify-between gap-2 mb-1">
                        <div class="flex items-center gap-2 min-w-0">
                            {#if row.icon}
                                <span class="text-base leading-none shrink-0">{row.icon}</span>
                            {/if}
                            <span class="text-sm font-medium truncate" title={row.label}>{row.label}</span>
                            <span class="text-xs text-muted-foreground shrink-0">· {row.count}</span>
                        </div>
                        <span class="font-mono text-sm tabular-nums whitespace-nowrap shrink-0">
                            {formatCurrency(row.value)}
                        </span>
                    </div>
                    <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                            class="h-full rounded-full transition-all"
                            style="width: {pct}%; background: {barColor};"
                        ></div>
                    </div>
                </button>
            {/each}
        </div>
        {#if hiddenCount > 0}
            <button
                type="button"
                onclick={() => (expanded = !expanded)}
                class="w-full flex items-center justify-center gap-1 border-t py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
                {#if expanded}
                    <ChevronUp class="size-3.5" />
                    Collapse
                {:else}
                    <ChevronDown class="size-3.5" />
                    Show all {sorted.length}
                {/if}
            </button>
        {/if}
    {/if}
</div>
