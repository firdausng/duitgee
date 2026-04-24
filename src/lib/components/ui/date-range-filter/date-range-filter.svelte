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
    }
</script>

<script lang="ts">
    import { cn, formatDatetimeLocal, type DateFilter as DateFilterType } from '$lib/utils';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
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
    }: DateRangeFilterProps = $props();

    let open = $state(false);
    let tab = $state<'quick' | 'relative' | 'absolute'>('quick');
    let containerRef: HTMLDivElement | null = $state(null);

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

    // ── Apply helpers ──────────────────────────────────────────────
    function applyPreset(id: DateFilterType) {
        onChange({ filter: id, startDate: undefined, endDate: undefined });
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
            class="absolute top-full left-0 mt-1 rounded-[var(--radius-md)] border bg-popover text-popover-foreground shadow-lg z-50 overflow-hidden w-auto max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto"
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
                        <Input
                            id="dr-abs-field"
                            type="datetime-local"
                            value={absActiveField === 'from' ? absFromInput : absToInput}
                            oninput={(e) => {
                                const v = (e.currentTarget as HTMLInputElement).value;
                                if (absActiveField === 'from') {
                                    absFromInput = v;
                                    if (v && !absToInput) absActiveField = 'to';
                                } else {
                                    absToInput = v;
                                }
                            }}
                            class="h-9 text-sm"
                        />
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
