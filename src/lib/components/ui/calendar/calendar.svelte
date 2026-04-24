<script lang="ts" module>
    import type { DateValue } from '@internationalized/date';

    export interface CalendarProps {
        ref?: HTMLDivElement | null;
        value?: DateValue | undefined;
        onValueChange?: (v: DateValue | undefined) => void;
        placeholder?: DateValue;
        weekdayFormat?: 'short' | 'long' | 'narrow';
        locale?: string;
        disableDaysOutsideMonth?: boolean;
        /**
         * How the month/year caption renders.
         *   `dropdown` (default) — both month + year as dropdowns; fast for jumps
         *   `dropdown-months` — only month as dropdown
         *   `dropdown-years` — only year as dropdown
         *   `label` — text-only, chevrons only (original compact layout)
         */
        captionLayout?: 'dropdown' | 'dropdown-months' | 'dropdown-years' | 'label';
        /** Year options for the year dropdown. Defaults to 20 back → 2 forward. */
        yearRange?: { back: number; forward: number };
        class?: string;
    }
</script>

<script lang="ts">
    import { Calendar as CalendarPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils.js';
    import { buttonVariants } from '$lib/components/ui/button/index.js';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';

    let {
        ref = $bindable(null),
        value = $bindable(),
        onValueChange,
        placeholder = $bindable(),
        weekdayFormat = 'short',
        class: className,
        locale = 'en-US',
        disableDaysOutsideMonth = false,
        captionLayout = 'dropdown',
        yearRange = { back: 20, forward: 2 },
    }: CalendarProps = $props();

    // Generate the years array for the dropdown. Centered around the current
    // year so a 3-years-ago back-fill is a single click away.
    const years = $derived.by(() => {
        const current = new Date().getFullYear();
        const out: number[] = [];
        for (let y = current - yearRange.back; y <= current + yearRange.forward; y++) {
            out.push(y);
        }
        return out;
    });

    const showMonthDropdown = $derived(
        captionLayout === 'dropdown' || captionLayout === 'dropdown-months',
    );
    const showYearDropdown = $derived(
        captionLayout === 'dropdown' || captionLayout === 'dropdown-years',
    );
</script>

<CalendarPrimitive.Root
    type="single"
    bind:ref
    {value}
    onValueChange={(v) => {
        value = v;
        onValueChange?.(v);
    }}
    bind:placeholder
    {weekdayFormat}
    {disableDaysOutsideMonth}
    {locale}
    monthFormat={showMonthDropdown ? 'short' : 'long'}
    class={cn(
        'bg-background p-3 [--cell-size:--spacing(8)] [[data-slot=popover-content]_&]:bg-transparent',
        className,
    )}
>
    {#snippet children({ months, weekdays })}
        <CalendarPrimitive.Header class="relative flex w-full items-center justify-between pt-1 gap-1">
            <CalendarPrimitive.PrevButton
                class={cn(
                    buttonVariants({ variant: 'ghost' }),
                    'size-7 bg-transparent p-0 opacity-60 hover:opacity-100 shrink-0',
                )}
            >
                <ChevronLeft class="size-4" />
            </CalendarPrimitive.PrevButton>

            {#if showMonthDropdown || showYearDropdown}
                <div class="flex flex-1 items-center justify-center gap-1">
                    {#if showMonthDropdown}
                        <span class="relative inline-flex items-center rounded-md border border-input shadow-xs has-focus:ring-2 has-focus:ring-ring">
                            <CalendarPrimitive.MonthSelect class="absolute inset-0 opacity-0 cursor-pointer">
                                {#snippet child({ props, monthItems, selectedMonthItem })}
                                    <select {...props}>
                                        {#each monthItems as m (m.value)}
                                            <option value={m.value} selected={m.value === selectedMonthItem.value}>
                                                {m.label}
                                            </option>
                                        {/each}
                                    </select>
                                    <span
                                        class="flex h-7 select-none items-center gap-1 rounded-md px-2 text-sm font-medium"
                                        aria-hidden="true"
                                    >
                                        {selectedMonthItem.label}
                                        <ChevronDown class="size-3.5 opacity-60" />
                                    </span>
                                {/snippet}
                            </CalendarPrimitive.MonthSelect>
                        </span>
                    {/if}
                    {#if showYearDropdown}
                        <span class="relative inline-flex items-center rounded-md border border-input shadow-xs has-focus:ring-2 has-focus:ring-ring">
                            <CalendarPrimitive.YearSelect years={years} class="absolute inset-0 opacity-0 cursor-pointer">
                                {#snippet child({ props, yearItems, selectedYearItem })}
                                    <select {...props}>
                                        {#each yearItems as y (y.value)}
                                            <option value={y.value} selected={y.value === selectedYearItem.value}>
                                                {y.label}
                                            </option>
                                        {/each}
                                    </select>
                                    <span
                                        class="flex h-7 select-none items-center gap-1 rounded-md px-2 text-sm font-medium tabular-nums"
                                        aria-hidden="true"
                                    >
                                        {selectedYearItem.label}
                                        <ChevronDown class="size-3.5 opacity-60" />
                                    </span>
                                {/snippet}
                            </CalendarPrimitive.YearSelect>
                        </span>
                    {/if}
                </div>
            {:else}
                <CalendarPrimitive.Heading class="text-sm font-medium" />
            {/if}

            <CalendarPrimitive.NextButton
                class={cn(
                    buttonVariants({ variant: 'ghost' }),
                    'size-7 bg-transparent p-0 opacity-60 hover:opacity-100 shrink-0',
                )}
            >
                <ChevronRight class="size-4" />
            </CalendarPrimitive.NextButton>
        </CalendarPrimitive.Header>

        {#each months as month (month.value)}
            <CalendarPrimitive.Grid class="mt-3 w-full border-collapse space-y-1">
                <CalendarPrimitive.GridHead>
                    <CalendarPrimitive.GridRow class="flex">
                        {#each weekdays as weekday (weekday)}
                            <CalendarPrimitive.HeadCell
                                class="text-muted-foreground w-(--cell-size) rounded-md text-[0.8rem] font-normal"
                            >
                                {weekday.slice(0, 2)}
                            </CalendarPrimitive.HeadCell>
                        {/each}
                    </CalendarPrimitive.GridRow>
                </CalendarPrimitive.GridHead>
                <CalendarPrimitive.GridBody>
                    {#each month.weeks as weekDates (weekDates)}
                        <CalendarPrimitive.GridRow class="mt-2 flex w-full">
                            {#each weekDates as date (date)}
                                <CalendarPrimitive.Cell
                                    {date}
                                    month={month.value}
                                    class="size-(--cell-size) relative p-0 text-center text-sm focus-within:z-20 [&:has([data-selected])]:bg-accent"
                                >
                                    <CalendarPrimitive.Day
                                        class={cn(
                                            buttonVariants({ variant: 'ghost' }),
                                            'size-(--cell-size) flex select-none items-center justify-center whitespace-nowrap p-0 font-normal leading-none',
                                            '[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground',
                                            'data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground',
                                            '[&[data-outside-month]:not([data-selected])]:text-muted-foreground [&[data-outside-month]:not([data-selected])]:opacity-50',
                                            'data-[disabled]:text-muted-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                                            'data-[unavailable]:line-through',
                                            'focus:border-ring focus:ring-ring/50 focus:relative',
                                        )}
                                    />
                                </CalendarPrimitive.Cell>
                            {/each}
                        </CalendarPrimitive.GridRow>
                    {/each}
                </CalendarPrimitive.GridBody>
            </CalendarPrimitive.Grid>
        {/each}
    {/snippet}
</CalendarPrimitive.Root>
