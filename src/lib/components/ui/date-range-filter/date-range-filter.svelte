<script lang="ts" module>
    import type { DateFilter } from '$lib/utils';

    export interface DateRangeFilterChange {
        filter: DateFilter;
        startDate?: string;
        endDate?: string;
    }

    export interface DateRangeFilterProps {
        value: DateFilter;
        /** Local datetime strings (yyyy-MM-ddTHH:mm) used when `value === 'custom'`. */
        startDate?: string;
        endDate?: string;
        onChange: (next: DateRangeFilterChange) => void;
        class?: string;
        /**
         * Anchor edge of the popover relative to the trigger.
         * - `'start'` (default): popover extends to the right from the left edge
         * - `'end'`: popover extends to the left from the right edge — use when the
         *   trigger sits near the right side of the viewport.
         * - `'auto'` (recommended): pick automatically based on available space.
         */
        align?: 'start' | 'end' | 'auto';
    }
</script>

<script lang="ts">
    import { cn, formatDatetimeLocal, type DateFilter as DateFilterType } from '$lib/utils';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { DateTimePicker } from '$lib/components/ui/date-time-picker';
    import CalendarIcon from '@lucide/svelte/icons/calendar';
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
    import Check from '@lucide/svelte/icons/check';
    import { CalendarDate, getLocalTimeZone, today, DateFormatter } from '@internationalized/date';
    import { page } from '$app/state';

    let {
        value,
        startDate = '',
        endDate = '',
        onChange,
        class: className,
        align = 'auto',
    }: DateRangeFilterProps = $props();

    let open = $state(false);
    let tab = $state<'quick' | 'period' | 'relative' | 'absolute'>('quick');
    let containerRef: HTMLDivElement | null = $state(null);
    let popoverRef: HTMLDivElement | null = $state(null);
    /** Resolved alignment for the popover — set after measuring when align='auto'. */
    let resolvedAlign = $state<'start' | 'end'>('start');

    const tz = getLocalTimeZone();
    const df = new DateFormatter('en', { month: 'short', day: 'numeric', year: 'numeric' });

    // ── Preset list ──────────────────────────────────────────────────
    type Preset = { id: DateFilterType; label: string };
    const presets: Preset[] = [
        { id: 'today', label: 'Today' },
        { id: 'yesterday', label: 'Yesterday' },
        { id: 'last7', label: 'Last 7 days' },
        { id: 'last30', label: 'Last 30 days' },
        { id: 'last90', label: 'Last 90 days' },
        { id: 'month', label: 'This month' },
        { id: 'year', label: 'This year' },
    ];

    // ── Period tab state (specific year / specific month) ───────────
    const NOW = new Date();
    const CURRENT_YEAR = NOW.getFullYear();
    // Show 10 years back. Stats history clamping is enforced server-side; the
    // picker shows everything and the API tells the user when it truncates.
    const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - i);
    const MONTHS = [
        { idx: 0, label: 'Jan' },
        { idx: 1, label: 'Feb' },
        { idx: 2, label: 'Mar' },
        { idx: 3, label: 'Apr' },
        { idx: 4, label: 'May' },
        { idx: 5, label: 'Jun' },
        { idx: 6, label: 'Jul' },
        { idx: 7, label: 'Aug' },
        { idx: 8, label: 'Sep' },
        { idx: 9, label: 'Oct' },
        { idx: 10, label: 'Nov' },
        { idx: 11, label: 'Dec' },
    ];
    let periodYear = $state(CURRENT_YEAR);
    /** -1 means "whole year" — month is unselected. */
    let periodMonth = $state<number>(-1);

    // ── Relative tab state ──────────────────────────────────────────
    type Unit = 'days' | 'weeks' | 'months' | 'years';
    const UNITS: Unit[] = ['days', 'weeks', 'months', 'years'];
    let relAmount = $state(7);
    let relUnit = $state<Unit>('days');

    const relativePreview = $derived.by(() => {
        if (relAmount <= 0) return null;
        const t = today(tz);
        const f = t.subtract({ [relUnit]: relAmount } as { [k in Unit]?: number });
        return {
            from: df.format(f.toDate(tz)),
            to: df.format(t.toDate(tz)),
        };
    });

    // ── Absolute tab state ──────────────────────────────────────────
    let absFromInput = $state('');
    let absToInput = $state('');
    let absActiveField = $state<'from' | 'to'>('from');

    $effect(() => {
        if (open && tab === 'absolute') {
            absFromInput = startDate;
            absToInput = endDate;
            absActiveField = 'from';
        }
    });

    // After picking a "from" date, auto-advance to the "to" field if it's still empty.
    $effect(() => {
        if (absActiveField === 'from' && absFromInput && !absToInput) {
            absActiveField = 'to';
        }
    });

    // ── Trigger label ───────────────────────────────────────────────
    const triggerLabel = $derived.by(() => {
        if (value === 'custom' && startDate && endDate) {
            try {
                return `${df.format(new Date(startDate))} — ${df.format(new Date(endDate))}`;
            } catch {
                return 'Custom range';
            }
        }
        const preset = presets.find((p) => p.id === value);
        if (preset) return preset.label;
        if (value === 'all') return 'All time';
        if (value === 'week') return 'This week';
        return 'Date range';
    });

    const hasValue = $derived(
        value !== 'all' || !!startDate || !!endDate,
    );

    // ── Open / close / outside click ───────────────────────────────
    function toggle() {
        open = !open;
    }
    function close() {
        open = false;
    }
    function onDocumentClick(e: MouseEvent) {
        if (!open) return;
        const target = e.target as Node;
        if (containerRef?.contains(target)) return;
        close();
    }
    function onKeydown(e: KeyboardEvent) {
        if (open && e.key === 'Escape') {
            close();
            e.preventDefault();
        }
    }
    $effect(() => {
        page.url.pathname;
        page.url.search;
        close();
    });

    // Resolve alignment when opening. For 'auto', anchor to whichever side
    // leaves more room from the trigger to the viewport edge.
    $effect(() => {
        if (!open) return;
        if (align !== 'auto') {
            resolvedAlign = align;
            return;
        }
        if (!containerRef) return;
        const rect = containerRef.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const spaceRight = viewportWidth - rect.left;
        const spaceLeft = rect.right;
        // If there's more room on the left than the right, anchor to end.
        resolvedAlign = spaceLeft > spaceRight ? 'end' : 'start';
    });

    // ── Apply helpers ──────────────────────────────────────────────
    function applyPreset(id: DateFilterType) {
        onChange({ filter: id, startDate: undefined, endDate: undefined });
        close();
    }

    function applyYear(year: number) {
        const start = new Date(year, 0, 1, 0, 0, 0, 0);
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        onChange({
            filter: 'custom',
            startDate: formatDatetimeLocal(start),
            endDate: formatDatetimeLocal(end),
        });
        close();
    }

    function applyMonth(year: number, month: number) {
        const start = new Date(year, month, 1, 0, 0, 0, 0);
        // Day 0 of next month = last day of `month`.
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        onChange({
            filter: 'custom',
            startDate: formatDatetimeLocal(start),
            endDate: formatDatetimeLocal(end),
        });
        close();
    }

    function applyRelative() {
        if (relAmount <= 0) return;
        const t = today(tz);
        const f = t.subtract({ [relUnit]: relAmount } as { [k in Unit]?: number });
        const start = f.toDate(tz);
        start.setHours(0, 0, 0, 0);
        const end = t.toDate(tz);
        end.setHours(23, 59, 59, 999);
        onChange({
            filter: 'custom',
            startDate: formatDatetimeLocal(start),
            endDate: formatDatetimeLocal(end),
        });
        close();
    }

    function applyAbsolute() {
        if (!absFromInput || !absToInput) return;
        onChange({
            filter: 'custom',
            startDate: absFromInput,
            endDate: absToInput,
        });
        close();
    }

    function clearRange() {
        onChange({ filter: 'all', startDate: undefined, endDate: undefined });
    }

    const tabs: { key: typeof tab; label: string }[] = [
        { key: 'quick', label: 'Quick' },
        { key: 'period', label: 'Period' },
        { key: 'relative', label: 'Relative' },
        { key: 'absolute', label: 'Absolute' },
    ];
</script>

<svelte:document onclick={onDocumentClick} onkeydown={onKeydown} />

<div bind:this={containerRef} class={cn('relative inline-flex', className)}>
    <!-- Trigger -->
    <button
        type="button"
        onclick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        class={cn(
            'inline-flex items-center gap-2 px-3 h-8 rounded-[var(--radius-sm)] border text-sm transition-colors',
            'border-input bg-transparent hover:bg-muted',
            !hasValue && 'text-muted-foreground',
        )}
    >
        <CalendarIcon class="size-3.5 shrink-0" />
        <span class="truncate max-w-[16rem]">{triggerLabel}</span>
        {#if hasValue}
            <span
                role="button"
                tabindex="0"
                onclick={(e) => {
                    e.stopPropagation();
                    clearRange();
                }}
                onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        clearRange();
                    }
                }}
                class="ml-0.5 shrink-0 inline-flex items-center justify-center size-5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Clear range"
                aria-label="Clear range"
            >
                <RotateCcw class="size-3" />
            </span>
        {/if}
    </button>

    <!-- Popover -->
    {#if open}
        <div
            bind:this={popoverRef}
            class={cn(
                'absolute top-full mt-1 rounded-[var(--radius-md)] border bg-popover text-popover-foreground shadow-lg z-50 overflow-hidden w-auto max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto',
                resolvedAlign === 'end' ? 'right-0' : 'left-0',
            )}
            role="dialog"
            aria-label="Date range filter"
            style="animation: dr-pop-in 120ms var(--ease-out);"
        >
            <!-- Tabs -->
            <div class="flex border-b">
                {#each tabs as t (t.key)}
                    {@const active = tab === t.key}
                    <button
                        type="button"
                        onclick={() => (tab = t.key)}
                        class={cn(
                            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                            active
                                ? 'text-foreground border-b-2 border-primary -mb-[1px]'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {t.label}
                    </button>
                {/each}
            </div>

            {#if tab === 'quick'}
                <!-- Quick presets -->
                <div class="p-1 min-w-0 sm:min-w-[220px]">
                    {#each presets as p (p.id)}
                        {@const active = value === p.id}
                        <button
                            type="button"
                            onclick={() => applyPreset(p.id)}
                            class="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] text-sm text-left hover:bg-muted transition-colors"
                        >
                            <span>{p.label}</span>
                            {#if active}
                                <Check class="size-4 text-primary" />
                            {/if}
                        </button>
                    {/each}
                </div>
            {:else if tab === 'period'}
                <!-- Specific year / month -->
                <div class="p-4 space-y-3 min-w-0 sm:min-w-[280px]">
                    <div class="flex items-center justify-between gap-2">
                        <Label for="dr-period-year" class="text-xs">Year</Label>
                        <select
                            id="dr-period-year"
                            bind:value={periodYear}
                            class="h-8 rounded-[var(--radius-sm)] border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {#each YEAR_OPTIONS as y (y)}
                                <option value={y}>{y}</option>
                            {/each}
                        </select>
                    </div>

                    <div class="flex justify-end">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onclick={() => applyYear(periodYear)}
                        >
                            Whole year {periodYear}
                        </Button>
                    </div>

                    <div>
                        <p class="text-xs text-muted-foreground mb-2">Or pick a month</p>
                        <div class="grid grid-cols-4 gap-1.5">
                            {#each MONTHS as m (m.idx)}
                                {@const isFuture =
                                    periodYear === CURRENT_YEAR && m.idx > NOW.getMonth()}
                                {@const active = periodMonth === m.idx}
                                <button
                                    type="button"
                                    disabled={isFuture}
                                    onclick={() => {
                                        periodMonth = m.idx;
                                        applyMonth(periodYear, m.idx);
                                    }}
                                    class={cn(
                                        'h-8 rounded-[var(--radius-sm)] border text-xs font-medium transition-colors',
                                        active
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-input text-foreground hover:bg-muted',
                                        isFuture && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                                    )}
                                >
                                    {m.label}
                                </button>
                            {/each}
                        </div>
                    </div>
                </div>
            {:else if tab === 'relative'}
                <!-- Relative -->
                <div class="p-4 min-w-0 sm:min-w-[280px]">
                    <p class="text-sm text-muted-foreground mb-3">Show data from the last</p>
                    <div class="flex gap-2 mb-4">
                        <input
                            type="number"
                            min="1"
                            bind:value={relAmount}
                            class="w-20 h-9 rounded-[var(--radius-sm)] border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <select
                            bind:value={relUnit}
                            class="flex-1 h-9 rounded-[var(--radius-sm)] border border-input bg-background px-3 py-1 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {#each UNITS as u}
                                <option value={u} class="capitalize">{u}</option>
                            {/each}
                        </select>
                    </div>
                    {#if relativePreview}
                        <p class="text-xs text-muted-foreground mb-3 text-right font-mono">
                            {relativePreview.from} — {relativePreview.to}
                        </p>
                    {/if}
                    <div class="flex justify-end">
                        <Button type="button" size="sm" onclick={applyRelative} disabled={relAmount <= 0}>
                            Apply
                        </Button>
                    </div>
                </div>
            {:else}
                <!-- Absolute -->
                <div class="p-4 space-y-3 min-w-0 sm:min-w-[280px]">
                    <div class="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onclick={() => (absActiveField = 'from')}
                            class={cn(
                                'rounded-[var(--radius-sm)] border px-3 py-1.5 text-left transition-colors',
                                absActiveField === 'from'
                                    ? 'border-primary bg-primary/5 font-medium'
                                    : 'border-input text-muted-foreground hover:bg-muted',
                            )}
                        >
                            <span class="text-[10px] uppercase tracking-wide block mb-0.5">From</span>
                            <span class="text-xs">
                                {absFromInput ? df.format(new Date(absFromInput)) : '—'}
                            </span>
                        </button>
                        <button
                            type="button"
                            onclick={() => (absActiveField = 'to')}
                            class={cn(
                                'rounded-[var(--radius-sm)] border px-3 py-1.5 text-left transition-colors',
                                absActiveField === 'to'
                                    ? 'border-primary bg-primary/5 font-medium'
                                    : 'border-input text-muted-foreground hover:bg-muted',
                            )}
                        >
                            <span class="text-[10px] uppercase tracking-wide block mb-0.5">To</span>
                            <span class="text-xs">
                                {absToInput ? df.format(new Date(absToInput)) : '—'}
                            </span>
                        </button>
                    </div>

                    <div class="space-y-2">
                        <Label for="dr-abs-field" class="text-xs capitalize">
                            Pick {absActiveField} date
                        </Label>
                        {#if absActiveField === 'from'}
                            <DateTimePicker
                                id="dr-abs-field"
                                bind:value={absFromInput}
                                placeholder="Pick start"
                            />
                        {:else}
                            <DateTimePicker
                                id="dr-abs-field"
                                bind:value={absToInput}
                                placeholder="Pick end"
                            />
                        {/if}
                    </div>

                    <div class="flex items-center justify-between gap-2">
                        <p class="text-xs text-muted-foreground font-mono truncate">
                            {#if absFromInput && absToInput}
                                {df.format(new Date(absFromInput))} — {df.format(new Date(absToInput))}
                            {:else if absFromInput}
                                From {df.format(new Date(absFromInput))}
                            {:else if absToInput}
                                Until {df.format(new Date(absToInput))}
                            {:else}
                                Select both dates
                            {/if}
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            onclick={applyAbsolute}
                            disabled={!absFromInput || !absToInput}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    @keyframes dr-pop-in {
        from {
            opacity: 0;
            transform: translateY(-4px) scale(0.97);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
</style>
