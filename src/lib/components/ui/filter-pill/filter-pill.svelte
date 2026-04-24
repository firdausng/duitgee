<script lang="ts" module>
    import type { FilterPill as FilterPillData } from '$lib/filters/filter-types';

    export interface FilterPillProps {
        pill: FilterPillData;
        /** Pretty label to render for the value(s). Computed by parent (it knows
         *  the data — resolving fundId → fundName, etc.). If omitted, values
         *  are rendered as-is. */
        displayValue?: string;
        /** When set, click the pill body invokes this (opens editor). */
        onEdit?: () => void;
        onRemove: () => void;
        class?: string;
    }
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import { FIELD_CONFIG, opLabel } from '$lib/filters/filter-types';
    import X from '@lucide/svelte/icons/x';

    let { pill, displayValue, onEdit, onRemove, class: className }: FilterPillProps = $props();

    const cfg = $derived(FIELD_CONFIG[pill.field]);
    const opText = $derived(opLabel(pill.op, pill.values.length > 1));
    const valueText = $derived(displayValue ?? pill.values.join(', '));
</script>

<span
    class={cn(
        'inline-flex items-center h-7 rounded-[var(--radius-sm)] text-xs border transition-colors',
        pill.negated
            ? 'border-destructive/40 bg-destructive/5 text-destructive'
            : 'border-border bg-muted/60 text-foreground',
        className,
    )}
>
    {#if onEdit}
        <button
            type="button"
            onclick={onEdit}
            class="inline-flex items-center gap-1 px-2 h-full hover:bg-black/[0.04] dark:hover:bg-white/[0.04] rounded-l-[var(--radius-sm)]"
            title="Edit filter"
        >
            {#if pill.negated}
                <span class="font-semibold uppercase text-[10px] tracking-wide">NOT·</span>
            {/if}
            <span class="text-muted-foreground">{cfg.label}</span>
            <span class="text-muted-foreground">{opText}</span>
            <span class="font-medium truncate max-w-[14rem]" title={valueText}>{valueText}</span>
        </button>
    {:else}
        <span class="inline-flex items-center gap-1 px-2 h-full">
            {#if pill.negated}
                <span class="font-semibold uppercase text-[10px] tracking-wide">NOT·</span>
            {/if}
            <span class="text-muted-foreground">{cfg.label}</span>
            <span class="text-muted-foreground">{opText}</span>
            <span class="font-medium truncate max-w-[14rem]" title={valueText}>{valueText}</span>
        </span>
    {/if}
    <button
        type="button"
        onclick={onRemove}
        class="inline-flex items-center justify-center h-full px-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] rounded-r-[var(--radius-sm)]"
        aria-label="Remove filter"
        title="Remove filter"
    >
        <X class="size-3" />
    </button>
</span>
