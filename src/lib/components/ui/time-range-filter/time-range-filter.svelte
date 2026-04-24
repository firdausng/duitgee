<script lang="ts" module>
    import type { DateFilter } from '$lib/utils';
    import { cn } from '$lib/utils';
    import Clock from '@lucide/svelte/icons/clock';
    import Calendar from '@lucide/svelte/icons/calendar';
    import CalendarRange from '@lucide/svelte/icons/calendar-range';
    import CalendarClock from '@lucide/svelte/icons/calendar-clock';
    import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
    import Globe from '@lucide/svelte/icons/globe';

    export interface TimeRangeFilterProps {
        value: DateFilter;
        onChange: (next: DateFilter) => void;
        /** Hide the Custom pill (use when there's no separate date picker surface). */
        hideCustom?: boolean;
        /** Hide the All pill. */
        hideAll?: boolean;
        class?: string;
    }
</script>

<script lang="ts">
    let { value, onChange, hideCustom = false, hideAll = false, class: className }: TimeRangeFilterProps = $props();

    type Option = { id: DateFilter; label: string; icon: typeof Clock };
    const allOptions: Option[] = [
        { id: 'today', label: 'Today', icon: Clock },
        { id: 'week', label: 'Week', icon: Calendar },
        { id: 'month', label: 'Month', icon: Calendar },
        { id: 'year', label: 'Year', icon: CalendarRange },
        { id: 'custom', label: 'Custom', icon: SlidersHorizontal },
        { id: 'all', label: 'All', icon: Globe },
    ];

    const options = $derived(
        allOptions.filter((o) => (hideCustom ? o.id !== 'custom' : true) && (hideAll ? o.id !== 'all' : true)),
    );
</script>

<div class={cn('flex flex-wrap items-center gap-1.5', className)} role="tablist" aria-label="Time range">
    {#each options as opt (opt.id)}
        {@const Icon = opt.icon}
        {@const active = value === opt.id}
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onclick={() => onChange(opt.id)}
            class={cn(
                'inline-flex items-center gap-1.5 px-3 h-8 rounded-[var(--radius-sm)] text-sm transition-colors',
                active
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-transparent text-muted-foreground hover:bg-muted border border-border',
            )}
        >
            <Icon class="size-3.5" />
            {opt.label}
        </button>
    {/each}
</div>
