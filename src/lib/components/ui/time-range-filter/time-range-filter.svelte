<script lang="ts" module>
    import type { DateFilter } from '$lib/utils';
    import { cn } from '$lib/utils';
    import Clock from '@lucide/svelte/icons/clock';
    import Calendar from '@lucide/svelte/icons/calendar';
    import CalendarRange from '@lucide/svelte/icons/calendar-range';

    export interface TimeRangeFilterProps {
        value: DateFilter;
        onChange: (next: DateFilter) => void;
        class?: string;
    }
</script>

<script lang="ts">
    let { value, onChange, class: className }: TimeRangeFilterProps = $props();

    type Option = { id: DateFilter; label: string; icon: typeof Clock };
    const options: Option[] = [
        { id: 'today', label: 'Today', icon: Clock },
        { id: 'yesterday', label: 'Yesterday', icon: Clock },
        { id: 'week', label: 'Week', icon: Calendar },
        { id: 'month', label: 'Month', icon: Calendar },
        { id: 'year', label: 'Year', icon: CalendarRange },
    ];
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
