<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import type { Expense } from "./types";
    import { scale } from "svelte/transition";

    type FilterType = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

    type Props = {
        expenses: Expense[];
        isLoading: boolean;
        filterType: FilterType;
        formatCurrency: (amount: number) => string;
        formatDate: (dateString: string) => string;
        onEditExpense: (expenseId: string) => void;
        onDeleteExpense: (expenseId: string) => void;
        onCreateExpense: () => void;
    };

    let {
        expenses,
        isLoading,
        filterType,
        formatCurrency,
        formatDate,
        onEditExpense,
        onDeleteExpense,
        onCreateExpense
    }: Props = $props();

    const filterTitle = $derived(() => {
        switch (filterType) {
            case 'today': return 'Expenses for today';
            case 'week': return 'Expenses for this week';
            case 'month': return 'Expenses for this month';
            case 'year': return 'Expenses for this year';
            case 'custom': return 'Expenses in selected date range';
            default: return 'All expenses';
        }
    });
</script>

<Card>
    <CardHeader>
        <CardTitle>Expenses</CardTitle>
        <CardDescription>
            {filterTitle()}
        </CardDescription>
    </CardHeader>
    <CardContent>
        {#if isLoading}
            <div class="flex justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        {:else if expenses.length === 0}
            <div class="text-center py-12" in:scale={{ start: 0.95, duration: 400 }}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
                <p class="text-muted-foreground mb-4">No expenses yet</p>
                <Button onclick={onCreateExpense}>Create your first expense</Button>
            </div>
        {:else}
            <div class="space-y-2" in:scale={{ start: 0.95, duration: 400 }}>
                {#each expenses as expense (expense.id)}
                    <div class="border rounded-lg p-3 hover:shadow-md transition-shadow bg-card">
                        <div class="flex items-start justify-between gap-3">
                            <!-- Left section: Content -->
                            <div class="flex-1 min-w-0">
                                <!-- Amount and Date -->
                                <div class="flex items-start justify-between gap-2 mb-1.5">
                                    <div class="text-lg font-bold">
                                        {formatCurrency(expense.amount)}
                                    </div>
                                    <div class="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatDate(expense.date)}
                                    </div>
                                </div>

                                <!-- Description -->
                                <div class="text-sm font-medium mb-1 truncate">
                                    {expense.note || 'No description'}
                                </div>

                                <!-- Category and Paid By -->
                                <div class="flex flex-wrap items-center gap-2 text-xs">
                                    {#if expense.category?.name}
                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                            {#if expense.category.icon}
                                                <span class="text-sm">{expense.category.icon}</span>
                                            {/if}
                                            <span>{expense.category.name}</span>
                                        </span>
                                    {:else}
                                        <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                            </svg>
                                            Invalid category
                                        </span>
                                    {/if}
                                    {#if expense.paidBy}
                                        <span class="text-xs text-muted-foreground">
                                            Paid by: {expense.paidByName}
                                        </span>
                                    {/if}
                                </div>
                            </div>

                            <!-- Right section: Actions -->
                            <div class="flex flex-col gap-1 flex-shrink-0">
                                <button
                                    class="p-1.5 hover:bg-accent rounded-md transition-colors"
                                    onclick={() => onEditExpense(expense.id)}
                                    aria-label="Edit expense"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                </button>
                                <button
                                    class="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                                    onclick={() => onDeleteExpense(expense.id)}
                                    aria-label="Delete expense"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </CardContent>
</Card>
