<script lang="ts">
    import { goto } from "$app/navigation";
    import { ofetch } from "ofetch";
    import { resource } from "runed";
    import RangeCalendar from "../../../../../lib/components/ui/range-calendar/range-calendar.svelte";
    import RangeCalendarDay from "$lib/components/ui/range-calendar/range-calendar-day.svelte";
    import { CalendarDate, isWeekend, now, getLocalTimeZone } from "@internationalized/date";
    import type { DateRange } from "bits-ui";
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
    import { LoadingOverlay } from "$lib/components/ui/loading-overlay";
    import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "$lib/components/ui/accordion";
    import type { Expense } from "../types";
    import type { VaultWithMember } from "$lib/schemas/read/vaultWithMember";
    import { format, parseISO } from "date-fns";

    let { data } = $props();
    let { vaultId } = data;

    // Refetch keys to trigger data reload
    let refetchKey = $state(0);
    let vaultRefetchKey = $state(0);

    // Calendar value - initialize to current month
    const today = now(getLocalTimeZone());
    let value = $state<DateRange | undefined>({
        start: today,
        end: today,
    });

    // Convert CalendarDate range to ISO date strings for API
    function getDateRangeFromCalendar(): { startDate?: string; endDate?: string } {
        if (!value?.start || !value?.end) return {};

        const start = new Date(value.start.year, value.start.month - 1, value.start.day, 0, 0, 0);
        const end = new Date(value.end.year, value.end.month - 1, value.end.day, 23, 59, 59, 999);

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString()
        };
    }

    // Resource for vault data
    const vaultResource = resource(
        () => [vaultId, vaultRefetchKey] as const,
        async ([id]) => {
            const response = await ofetch<{ success: boolean, data: VaultWithMember }>(`/api/getVault?vaultId=${id}`);
            return response.data;
        }
    );

    // Resource for ALL expenses (for calendar daily totals - independent of filter)
    const allExpensesResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const urlParams = new URLSearchParams({
                vaultId: id,
                page: '1',
                limit: '1000' // Get all expenses
            });

            const response = await ofetch<{ expenses: Expense[], pagination: any }>(`/api/getExpenses?${urlParams.toString()}`);
            return response.expenses || [];
        }
    );

    // Resource for filtered expenses - reactive to calendar selection (for the list below)
    const filteredExpensesResource = resource(
        () => [vaultId, value?.start, value?.end, refetchKey] as const,
        async ([id, start, end]) => {
            const dateRange = getDateRangeFromCalendar();
            const urlParams = new URLSearchParams({
                vaultId: id,
                page: '1',
                limit: '1000' // Get expenses for the selected period
            });

            // Add date filters from calendar selection
            if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
            if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);

            const response = await ofetch<{ expenses: Expense[], pagination: any }>(`/api/getExpenses?${urlParams.toString()}`);
            return response.expenses || [];
        }
    );

    // Derive data from resources
    const currentVault = $derived(vaultResource.current);
    const allExpenses = $derived(allExpensesResource.current || []); // For calendar daily totals
    const expenses = $derived(filteredExpensesResource.current || []); // For filtered list
    const isLoadingVault = $derived(vaultResource.loading);
    const isLoadingExpenses = $derived(filteredExpensesResource.loading);

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

    // Group expenses by date
    const expensesByDate = $derived.by(() => {
        const grouped = new Map<string, Expense[]>();

        for (const expense of expenses) {
            const date = parseISO(expense.date);
            const dateKey = format(date, 'yyyy-MM-dd');

            if (!grouped.has(dateKey)) {
                grouped.set(dateKey, []);
            }
            grouped.get(dateKey)!.push(expense);
        }

        // Convert to array and sort by date (most recent first)
        return Array.from(grouped.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([dateKey, expenseList]) => ({
                dateKey,
                dateLabel: format(parseISO(dateKey), 'EEEE, MMM d, yyyy'),
                expenses: expenseList
            }));
    });

    // Calculate filtered statistics
    const filteredTotal = $derived.by(() => {
        if (!expenses.length) return { amount: 0, count: 0 };
        return {
            amount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
            count: expenses.length
        };
    });

    function handleBack() {
        goto(`/vaults/${vaultId}`);
    }

    function formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async function handleDeleteExpense(expenseId: string) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            await ofetch('/api/deleteExpense', {
                method: 'POST',
                body: JSON.stringify({ id: expenseId, vaultId }),
                headers: { 'Content-Type': 'application/json' }
            });

            // Trigger refetch of expenses
            refetchKey++;
        } catch (error) {
            console.error('Failed to delete expense:', error);
            alert('Failed to delete expense. Please try again.');
        }
    }

    function handleEditExpense(expenseId: string) {
        goto(`/vaults/${vaultId}/expenses/${expenseId}/edit`);
    }

    function getDailyTotal(day: CalendarDate): number {
        const dateKey = `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
        return dailyTotals.get(dateKey) || 0;
    }
</script>

<svelte:head>
    <title>Calendar - {currentVault?.vaults.name || 'Vault'} - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-8 px-4 max-w-7xl relative">
    {#if isLoadingVault}
        <!-- Loading State -->
        <div class="flex flex-col items-center justify-center py-16">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p class="mt-4 text-muted-foreground">Loading vault...</p>
        </div>
    {:else if !currentVault}
        <!-- Error State -->
        <Card class="border-destructive">
            <CardContent class="flex flex-col items-center justify-center py-16 px-4">
                <h2 class="text-2xl font-semibold mb-2">Vault not found</h2>
                <p class="text-muted-foreground text-center max-w-md mb-6">
                    The vault you're looking for doesn't exist or you don't have access to it.
                </p>
                <Button onclick={handleBack}>
                    Back to Vaults
                </Button>
            </CardContent>
        </Card>
    {:else}
        <LoadingOverlay show={isLoadingExpenses} />

        <!-- Header -->
<!--        <div class="mb-6">-->
<!--            <h1 class="text-3xl font-bold">Calendar</h1>-->
<!--            <p class="text-muted-foreground mt-1">Select a date range to view expenses</p>-->
<!--        </div>-->

        <!-- Calendar -->
        <Accordion type="multiple" class="mb-6">
            <AccordionItem value="calendar" class="border rounded-lg px-4">
                <AccordionTrigger class="hover:no-underline py-3">
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                        </svg>
                        <div class="text-left">
                            <h3 class="text-sm font-semibold">Calendar</h3>
                            <p class="text-xs text-muted-foreground">Select a date range to view expenses</p>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div class="pb-4">
                        <RangeCalendar
                            bind:value
                            class="rounded-lg border shadow-sm [--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
                            monthFormat="long"
                            captionLayout="dropdown"
                        >
                            {#snippet day({ day, outsideMonth })}
                                {@const dailyTotal = getDailyTotal(day)}
                                {@const dayIsWeekend = isWeekend(day, "en-US")}
                                <RangeCalendarDay class="flex flex-col items-center relative">
                                    <span>{day.day}</span>
                                    {#if !outsideMonth && dailyTotal > 0}
                                        <span class="text-xs font-semibold text-primary absolute -bottom-2.5 right-0 -mt-1 -mr-1 bg-card border border-border rounded-full px-1.5 py-0.5 shadow-sm">
                                            {formatCurrency(dailyTotal)}
                                        </span>
                                    {/if}
                                </RangeCalendarDay>
                            {/snippet}
                        </RangeCalendar>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>

        <!-- Summary -->
<!--        <Card class="mb-6">-->
<!--            <CardHeader>-->
<!--                <CardTitle>Summary</CardTitle>-->
<!--                <CardDescription>Total expenses for selected period</CardDescription>-->
<!--            </CardHeader>-->
<!--            <CardContent>-->
<!--                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">-->
<!--                    <div>-->
<!--                        <p class="text-sm text-muted-foreground mb-1">Total Amount</p>-->
<!--                        <p class="text-3xl font-bold">{formatCurrency(filteredTotal.amount)}</p>-->
<!--                    </div>-->
<!--                    <div>-->
<!--                        <p class="text-sm text-muted-foreground mb-1">Total Expenses</p>-->
<!--                        <p class="text-3xl font-bold">{filteredTotal.count}</p>-->
<!--                    </div>-->
<!--                </div>-->
<!--            </CardContent>-->
<!--        </Card>-->

        <!-- Expenses List -->
        <Card>
            <CardHeader>
                <CardTitle>Expenses - <span class="text-sm font-light">{filteredTotal.count} </span></CardTitle>
            </CardHeader>
            <CardContent>
                {#if expenses.length === 0}
                    <div class="text-center py-12">
                        <div class="text-6xl mb-4">📅</div>
                        <h3 class="text-lg font-semibold mb-2">No expenses found</h3>
                        <p class="text-muted-foreground">
                            There are no expenses for the selected date range.
                        </p>
                    </div>
                {:else}
                    <!-- Mobile Accordion Layout -->
                    <div class="sm:hidden">
                        {#each expensesByDate as dateGroup (dateGroup.dateKey)}
                            <!-- Date Header -->
                            <div class="sticky top-0 flex justify-center mb-2">
                                <h3 class="text-sm font-semibold text-foreground bg-muted/80 backdrop-blur-sm px-3 py-2 rounded-md inline-block">
                                    {dateGroup.dateLabel}
                                </h3>
                            </div>

                            <!-- Expenses for this date -->
                            <Accordion type="multiple" class="mb-4">
                                {#each dateGroup.expenses as expense (expense.id)}
                                    <AccordionItem value={expense.id} class="border rounded-lg mb-2 px-3">
                                        <AccordionTrigger class="hover:no-underline py-2">
                                            <div class="flex items-start justify-between w-full pr-2">
                                                <div class="flex-1 min-w-0">
                                                    <p class="text-xs font-medium line-clamp-1 text-left">
                                                        {expense.note || '-'}
                                                    </p>
                                                </div>
                                                <div class="text-right ml-2">
                                                    <p class="text-sm font-bold whitespace-nowrap">{formatCurrency(expense.amount)}</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div class="space-y-3 pt-2">
                                                <!-- Details -->
                                                <div class="space-y-2 text-sm">
                                                    <div class="flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                                                        </svg>
                                                        {#if expense.category?.name}
                                                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                                                                {#if expense.category.icon}
                                                                    <span class="text-sm">{expense.category.icon}</span>
                                                                {/if}
                                                                <span>{expense.category.name}</span>
                                                            </span>
                                                        {:else}
                                                            <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-xs font-semibold">
                                                                Invalid category
                                                            </span>
                                                        {/if}
                                                    </div>
                                                    <div class="flex items-center gap-2 text-muted-foreground">
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                                                        </svg>
                                                        <span>{formatDate(expense.date)}</span>
                                                    </div>
                                                    {#if expense.paidByName}
                                                        <div class="flex items-center gap-2 text-muted-foreground">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                                            </svg>
                                                            <span>Paid by: {expense.paidByName}</span>
                                                        </div>
                                                    {/if}
                                                </div>
                                                <!-- Actions -->
                                                <div class="flex gap-2 pt-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onclick={() => handleEditExpense(expense.id)}
                                                        class="flex-1"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onclick={() => handleDeleteExpense(expense.id)}
                                                        class="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                                        </svg>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                {/each}
                            </Accordion>
                        {/each}
                    </div>

                    <!-- Desktop Accordion Layout -->
                    <div class="hidden sm:block">
                        {#each expensesByDate as dateGroup (dateGroup.dateKey)}
                            <!-- Date Header -->
                            <div class="sticky top-0 flex justify-center mb-2">
                                <h3 class="text-sm font-semibold text-foreground bg-muted/80 backdrop-blur-sm px-4 py-2.5 rounded-md inline-block">
                                    {dateGroup.dateLabel}
                                </h3>
                            </div>

                            <!-- Expenses for this date -->
                            <Accordion type="multiple" class="mb-4">
                                {#each dateGroup.expenses as expense (expense.id)}
                                    <AccordionItem value={expense.id} class="border rounded-lg mb-2 px-4">
                                        <AccordionTrigger class="hover:no-underline py-2.5">
                                            <div class="flex items-start justify-between w-full pr-2">
                                                <div class="flex-1 min-w-0">
                                                    <p class="text-sm font-medium line-clamp-1 text-left">
                                                        {expense.note || '-'}
                                                    </p>
                                                </div>
                                                <div class="text-right ml-4">
                                                    <p class="text-base font-bold whitespace-nowrap">{formatCurrency(expense.amount)}</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div class="flex items-center justify-between pt-2">
                                                <!-- Details -->
                                                <div class="flex items-center gap-6 text-sm">
                                                    <div class="flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                                                        </svg>
                                                        {#if expense.category?.name}
                                                            <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                                                                {expense.category.name}
                                                            </span>
                                                        {:else}
                                                            <span class="inline-flex items-center px-2 py-0-5 rounded-md bg-destructive/10 text-destructive text-xs font-semibold">
                                                                Invalid category
                                                            </span>
                                                        {/if}
                                                    </div>
                                                    <div class="flex items-center gap-2 text-muted-foreground">
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                                                        </svg>
                                                        <span>{formatDate(expense.date)}</span>
                                                    </div>
                                                    {#if expense.paidByName}
                                                        <div class="flex items-center gap-2 text-muted-foreground">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                                                            </svg>
                                                            <span>Paid by: {expense.paidByName}</span>
                                                        </div>
                                                    {/if}
                                                </div>
                                                <!-- Actions -->
                                                <div class="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onclick={() => handleEditExpense(expense.id)}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onclick={() => handleDeleteExpense(expense.id)}
                                                        class="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                                        </svg>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                {/each}
                            </Accordion>
                        {/each}
                    </div>
                {/if}
            </CardContent>
        </Card>
    {/if}
</div>
