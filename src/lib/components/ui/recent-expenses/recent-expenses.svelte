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
        /** Group rows under day headers with per-day subtotals. */
        grouped?: boolean;
        class?: string;
    }
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import { Amount } from '$lib/components/ui/amount';
    import { groupExpensesByDay } from '$lib/utils/groupExpensesByDay';
    import { isToday, isYesterday } from 'date-fns';
    import Receipt from '@lucide/svelte/icons/receipt';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';

    let {
        expenses,
        limit = 10,
        onSelect,
        formatCurrency,
        formatDate,
        grouped = false,
        class: className,
    }: RecentExpensesProps = $props();

    const visible = $derived(expenses.slice(0, limit));
    const groups = $derived(grouped ? groupExpensesByDay(visible) : []);

    function dayLabel(dayStart: Date): string {
        if (isToday(dayStart)) return 'Today';
        if (isYesterday(dayStart)) return 'Yesterday';
        return formatDate(dayStart.toISOString());
    }
</script>

{#snippet row(expense: Expense)}
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
            <p class="font-medium break-words">
                {expense.note || expense.category?.name || 'Expense'}
                {#if expense.recurringExpenseId}
                    <RefreshCw
                        class="inline-block size-3 text-muted-foreground align-middle ml-1 shrink-0"
                        aria-label="From recurring rule"
                    />
                {/if}
            </p>
            <div class="flex items-start justify-between gap-2 mt-0.5">
                <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground min-w-0">
                    {#if expense.category?.name}
                        <span>{expense.category.name}</span>
                    {/if}
                    {#if expense.fundName}
                        <span class="opacity-50">·</span>
                        <span title={expense.fundName}>
                            {expense.fundIcon ?? ''} {expense.fundName}
                        </span>
                    {/if}
                    {#if expense.paidByName}
                        <span class="opacity-50">·</span>
                        <span>{expense.paidByName}</span>
                    {/if}
                </div>
                <div class="shrink-0 flex flex-col items-end gap-0.5">
                    <Amount
                        value={-expense.amount}
                        sign="negative"
                        showSign={false}
                        formatted={formatCurrency(expense.amount)}
                        size="sm"
                    />
                    <span class="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(expense.date)}
                    </span>
                </div>
            </div>
        </div>

        <ChevronRight class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
{/snippet}

{#if visible.length === 0}
    <div class={cn('rounded-[var(--radius-md)] border bg-card overflow-hidden', className)}>
        <div class="flex flex-col items-center justify-center text-center py-10 px-4">
            <div class="flex items-center justify-center size-10 rounded-full bg-muted mb-2">
                <Receipt class="size-5 text-muted-foreground" />
            </div>
            <p class="text-sm text-muted-foreground">No expenses yet in this range.</p>
        </div>
    </div>
{:else if grouped}
    <div class={cn('flex flex-col gap-4', className)}>
        {#each groups as group (group.dayKey)}
            <div>
                <div class="flex items-center justify-between gap-3 px-1 pb-1.5">
                    <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {dayLabel(group.dayStartLocal)}
                    </span>
                    <span class="text-xs text-muted-foreground whitespace-nowrap">
                        {group.count} {group.count === 1 ? 'entry' : 'entries'}
                        · <span class="font-mono">{formatCurrency(group.total)}</span>
                    </span>
                </div>
                <div class="rounded-[var(--radius-md)] border bg-card overflow-hidden divide-y divide-border">
                    {#each group.items as expense (expense.id)}
                        {@render row(expense)}
                    {/each}
                </div>
            </div>
        {/each}
    </div>
{:else}
    <div class={cn('rounded-[var(--radius-md)] border bg-card overflow-hidden', className)}>
        <div class="divide-y divide-border">
            {#each visible as expense (expense.id)}
                {@render row(expense)}
            {/each}
        </div>
    </div>
{/if}
