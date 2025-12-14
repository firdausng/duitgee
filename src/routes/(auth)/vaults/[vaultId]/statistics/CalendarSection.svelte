<script lang="ts">
    import RangeCalendar from "$lib/components/ui/range-calendar/range-calendar.svelte";
    import RangeCalendarDay from "$lib/components/ui/range-calendar/range-calendar-day.svelte";
    import {CalendarDate, isWeekend} from "@internationalized/date";
    import type {DateRange} from "bits-ui";
    import {Accordion, AccordionItem, AccordionTrigger, AccordionContent} from "$lib/components/ui/accordion";
    import {formatCurrency} from "./utils";
    import type {Expense} from "../types";
    import {format, parseISO} from "date-fns";
    import { getDayBudgetStatus, type Budget } from "./budgetUtils";

    type Props = {
        value: DateRange | undefined;
        placeholder: CalendarDate;
        allExpenses: Expense[];
        budget?: Budget | null;
        onValueChange: (value: DateRange | undefined) => void;
    };

    let {value = $bindable(), placeholder = $bindable(), allExpenses, budget = null, onValueChange}: Props = $props();

    // Format the date range for display
    const dateRangeLabel = $derived.by(() => {
        if (!value?.start || !value?.end) return 'Select a date range';

        const startDate = new Date(value.start.year, value.start.month - 1, value.start.day);
        const endDate = new Date(value.end.year, value.end.month - 1, value.end.day);

        const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

        // If same day, show single date
        if (startDate.getTime() === endDate.getTime()) {
            return startDate.toLocaleDateString('en-US', formatOptions);
        }

        // If same year, omit year from start date
        if (startDate.getFullYear() === endDate.getFullYear()) {
            return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', formatOptions)}`;
        }

        // Different years, show full dates
        return `${startDate.toLocaleDateString('en-US', formatOptions)} - ${endDate.toLocaleDateString('en-US', formatOptions)}`;
    });

    // Calculate daily totals for calendar display (using ALL expenses, independent of filter)
    const dailyTotals = $derived.by(() => {
        const totals = new Map<string, number>();

        for (const expense of allExpenses) {
            const date = parseISO(expense.date);
            const dateKey = format(date, 'yyyy-MM-dd');

            const current = totals.get(dateKey) || 0;
            totals.set(dateKey, current + expense.amount);
        }

        return totals;
    });

    function getDailyTotal(day: CalendarDate): number {
        const dateKey = `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
        return dailyTotals.get(dateKey) || 0;
    }

    function getDayBudgetColor(day: CalendarDate): string {
        if (!budget) return '';

        const date = new Date(day.year, day.month - 1, day.day);
        const status = getDayBudgetStatus(date, budget, allExpenses);

        if (!status) return '';

        switch (status) {
            case 'under':
                return 'bg-green-500/10 border-green-500/30';
            case 'warning':
                return 'bg-yellow-500/10 border-yellow-500/30';
            case 'over':
                return 'bg-red-500/10 border-red-500/30';
            default:
                return '';
        }
    }
</script>

<Accordion type="multiple" class="mb-6">
    <AccordionItem value="calendar" class="border rounded-lg px-4">
        <AccordionTrigger class="hover:no-underline py-3">
            <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                </svg>
                <div class="text-left">
                    <h3 class="text-xs font-semibold">Calendar</h3>
                    <p class="text-xs text-muted-foreground">{dateRangeLabel}</p>
                </div>
            </div>
        </AccordionTrigger>
        <AccordionContent>
            <div class="pb-4">
                <RangeCalendar
                    bind:value
                    bind:placeholder
                    class="rounded-lg border shadow-sm [--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
                    monthFormat="long"
                    captionLayout="dropdown"
                >
                    {#snippet day({ day, outsideMonth })}
                        {@const dailyTotal = getDailyTotal(day)}
                        {@const dayIsWeekend = isWeekend(day, "en-US")}
                        {@const budgetColor = getDayBudgetColor(day)}
                        <RangeCalendarDay class="flex flex-col items-center relative {budgetColor ? `border ${budgetColor}` : ''}">
                            <span>{day.day}</span>
                            {#if !outsideMonth && dailyTotal > 0}
                                <span class="text-xs font-semibold text-primary absolute -bottom-2.5 right-0 -mt-1 -mr-1 bg-card border border-border rounded-full px-1.5 py-0.5 shadow-sm">
                                    {formatCurrency(dailyTotal, 0)}
                                </span>
                            {/if}
                        </RangeCalendarDay>
                    {/snippet}
                </RangeCalendar>
            </div>
        </AccordionContent>
    </AccordionItem>
</Accordion>
