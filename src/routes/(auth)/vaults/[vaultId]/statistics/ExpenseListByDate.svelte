<script lang="ts">
    import {Button} from "$lib/components/ui/button";
    import {Accordion, AccordionItem, AccordionTrigger, AccordionContent} from "$lib/components/ui/accordion";
    import type {Expense} from "../types";

    type DateGroup = {
        dateKey: string;
        dateLabel: string;
        expenses: Expense[];
    };

    type Props = {
        expensesByDate: DateGroup[];
        onEdit: (expenseId: string) => void;
        onDelete: (expenseId: string) => void;
        formatCurrency: (amount: number) => string;
        formatDate: (dateString: string) => string;
    };

    let {expensesByDate, onEdit, onDelete, formatCurrency, formatDate}: Props = $props();
</script>

{#if expensesByDate.length === 0}
    <div class="text-center py-12">
        <div class="text-6xl mb-4">📊</div>
        <h3 class="text-lg font-semibold mb-2">No expenses found</h3>
        <p class="text-muted-foreground">
            There are no expenses matching your current filters.
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
                                            <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                                                {expense.category.name}
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
                                        onclick={() => onEdit(expense.id)}
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
                                        onclick={() => onDelete(expense.id)}
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
                                <div class="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onclick={() => onEdit(expense.id)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onclick={() => onDelete(expense.id)}
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
