<script lang="ts" module>
    export interface DateTimePickerProps {
        /** ISO-ish value in local datetime format: "YYYY-MM-DDTHH:mm" (time optional). Two-way bindable. */
        value?: string;
        /** Include a time strip under the calendar. Defaults to true. */
        showTime?: boolean;
        /** Placeholder text shown when value is empty. */
        placeholder?: string;
        disabled?: boolean;
        /** Form field name (hidden input) for native form submission. */
        name?: string;
        id?: string;
        class?: string;
    }
</script>

<script lang="ts">
    import { Calendar } from '$lib/components/ui/calendar';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { cn } from '$lib/utils';
    import { CalendarDate, parseDate, type DateValue } from '@internationalized/date';
    import CalendarIcon from '@lucide/svelte/icons/calendar';
    import X from '@lucide/svelte/icons/x';

    let {
        value = $bindable(''),
        showTime = true,
        placeholder = 'Pick a date',
        disabled = false,
        name,
        id,
        class: className,
    }: DateTimePickerProps = $props();

    let open = $state(false);
    let containerRef: HTMLDivElement | null = $state(null);

    function parseValue(v: string): { date: CalendarDate | undefined; time: string } {
        if (!v) return { date: undefined, time: '00:00' };
        const [datePart, timePart = '00:00'] = v.split('T');
        try {
            return { date: parseDate(datePart), time: timePart.slice(0, 5) };
        } catch {
            return { date: undefined, time: '00:00' };
        }
    }

    let internalDate = $state<CalendarDate | undefined>(parseValue(value).date);
    let internalTime = $state(parseValue(value).time);

    // Keep internal state in sync when the bound value changes externally
    // (e.g. form reset). Compare string payload so typing in the time input
    // doesn't loop.
    $effect(() => {
        const current = composeValue(internalDate, internalTime);
        if (value !== current) {
            const p = parseValue(value);
            internalDate = p.date;
            internalTime = p.time;
        }
    });

    function composeValue(d: CalendarDate | undefined, t: string): string {
        if (!d) return '';
        const yyyy = String(d.year).padStart(4, '0');
        const mm = String(d.month).padStart(2, '0');
        const dd = String(d.day).padStart(2, '0');
        const datePart = `${yyyy}-${mm}-${dd}`;
        return showTime ? `${datePart}T${t}` : datePart;
    }

    function formatDisplay(): string {
        if (!internalDate) return placeholder;
        const d = new Date(internalDate.year, internalDate.month - 1, internalDate.day);
        const dateStr = d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
        if (!showTime) return dateStr;
        return `${dateStr} · ${internalTime}`;
    }

    function handleDateChange(next: DateValue | undefined) {
        internalDate = next as CalendarDate | undefined;
        value = composeValue(internalDate, internalTime);
        // Auto-close on pick when no time input shown.
        if (!showTime) open = false;
    }

    function handleTimeInput(next: string) {
        internalTime = next || '00:00';
        value = composeValue(internalDate, internalTime);
    }

    function toggle() {
        if (disabled) return;
        open = !open;
    }

    function clear(e: MouseEvent) {
        e.stopPropagation();
        internalDate = undefined;
        internalTime = '00:00';
        value = '';
    }

    function handleClickOutside(e: MouseEvent) {
        if (containerRef && !containerRef.contains(e.target as Node)) {
            open = false;
        }
    }

    $effect(() => {
        if (!open) return;
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    });
</script>

<div class={cn('relative', className)} bind:this={containerRef}>
    {#if name}
        <input type="hidden" {name} {value} />
    {/if}
    <Button
        type="button"
        variant="outline"
        {disabled}
        onclick={toggle}
        class="w-full justify-start font-normal pr-2"
        aria-haspopup="dialog"
        aria-expanded={open}
        {id}
    >
        <CalendarIcon class="size-4 mr-2 shrink-0" />
        <span class="flex-1 text-left truncate {internalDate ? '' : 'text-muted-foreground'}">
            {formatDisplay()}
        </span>
        {#if internalDate && !disabled}
            <button
                type="button"
                onclick={clear}
                class="ml-1 p-0.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Clear date"
                title="Clear"
            >
                <X class="size-3.5" />
            </button>
        {/if}
    </Button>
    {#if open}
        <div
            class="absolute z-50 mt-1 rounded-md border bg-popover shadow-md"
            data-slot="popover-content"
        >
            <Calendar
                value={internalDate}
                onValueChange={handleDateChange}
            />
            {#if showTime}
                <div class="border-t p-3">
                    <Input
                        type="time"
                        value={internalTime}
                        oninput={(e) => handleTimeInput((e.currentTarget as HTMLInputElement).value)}
                    />
                </div>
            {/if}
        </div>
    {/if}
</div>
