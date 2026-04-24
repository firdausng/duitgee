<script lang="ts" module>
    import type { Expense } from '$lib/../routes/(auth)/vaults/[vaultId]/types';

    export interface RecentExpensesProps {
        expenses: Expense[];
        /** Max rows to display. */
        limit?: number;
        /** Called when user clicks a row (for edit or detail navigation). */
        onSelect?: (expense: Expense) => void;
        formatCurrency: (amount: number) => string;
        formatDate: (iso: string) => string;
        class?: string;
    }
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import { Amount } from '$lib/components/ui/amount';
    import Receipt from '@lucide/svelte/icons/receipt';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';

    let {
        expenses,
        limit = 10,
        onSelect,
        formatCurrency,
        formatDate,
        class: className,
    }: RecentExpensesProps = $props();

    const visible = $derived(expenses.slice(0, limit));
</script>

<div class={cn('rounded-[var(--radius-md)] border bg-card overflow-hidden', className)}>
    {#if visible.length === 0}
        <div class="flex flex-col items-center justify-center text-center py-10 px-4">
            <div class="flex items-center justify-center size-10 rounded-full bg-muted mb-2">
                <Receipt class="size-5 text-muted-foreground" />
            </div>
            <p class="text-sm text-muted-foreground">No expenses yet in this range.</p>
        </div>
    {:else}
        <div class="divide-y divide-border">
            {#each visible as expense (expense.id)}
                <button
                    type="button"
                    onclick={() => onSelect?.(expense)}
                    class="group w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                >
                    <span
                        class="text-xl leading-none shrink-0 select-none"
                        style={expense.category?.color
                            ? `background: ${expense.category.color}15; padding: 6px; border-radius: var(--radius-sm);`
                            : ''}
                        aria-hidden="true"
                    >
                        {expense.category?.icon ?? '📝'}
                    </span>

                    <div class="flex-1 min-w-0">
                        <div class="flex items-baseline justify-between gap-2">
                            <span class="font-medium truncate">
                                {expense.note || expense.category?.name || 'Expense'}
                            </span>
                            <Amount
                                value={-expense.amount}
                                sign="negative"
                                showSign={false}
                                formatted={formatCurrency(expense.amount)}
                                size="sm"
                            />
                        </div>
                        <div class="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                            {#if expense.category?.name}
                                <span class="truncate">{expense.category.name}</span>
                            {/if}
                            {#if expense.fundName}
                                <span class="opacity-50">·</span>
                                <span class="truncate" title={expense.fundName}>
                                    {expense.fundIcon ?? ''} {expense.fundName}
                                </span>
                            {/if}
                            {#if expense.paidByName}
                                <span class="opacity-50">·</span>
                                <span class="truncate">{expense.paidByName}</span>
                            {/if}
                            <span class="opacity-50">·</span>
                            <span class="shrink-0 whitespace-nowrap">{formatDate(expense.date)}</span>
                        </div>
                    </div>

                    <ChevronRight class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
            {/each}
        </div>
    {/if}
</div>
