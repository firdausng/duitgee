<script lang="ts" module>
    import type { Expense } from '$lib/../routes/(auth)/vaults/[vaultId]/types';

    export interface RecentExpensesProps {
        expenses: Expense[];
        /** Max rows to display. */
        limit?: number;
        /** Called when user taps the row body (or picks Edit from the kebab). */
        onSelect?: (expense: Expense) => void;
        /** Called when user picks Delete from the kebab. Parent handles confirmation. */
        onDelete?: (expense: Expense) => void;
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
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import MoreVertical from '@lucide/svelte/icons/more-vertical';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

    let {
        expenses,
        limit = 10,
        onSelect,
        onDelete,
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

    function handleRowClick(e: MouseEvent, expense: Expense) {
        const t = e.target as HTMLElement;
        if (t.closest('button, [role="menuitem"], [data-no-nav]')) return;
        onSelect?.(expense);
    }

    function handleRowKey(e: KeyboardEvent, expense: Expense) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(expense);
        }
    }
</script>

{#snippet row(expense: Expense)}
    <div
        role="button"
        tabindex="0"
        onclick={(e) => handleRowClick(e, expense)}
        onkeydown={(e) => handleRowKey(e, expense)}
        class="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset transition-colors"
    >
        <div class="flex-1 min-w-0">
            <p class="font-medium break-words">
                <span class="mr-1.5" aria-hidden="true">{expense.category?.icon ?? '📝'}</span>
                {expense.note || expense.category?.name || 'Expense'}
                {#if expense.recurringExpenseId}
                    <RefreshCw
                        class="inline-block size-3 text-muted-foreground align-middle ml-1 shrink-0"
                        aria-label="From recurring rule"
                    />
                {/if}
                <Amount
                    class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs align-middle ml-2"
                    value={-expense.amount}
                    sign="negative"
                    showSign={false}
                    formatted={formatCurrency(expense.amount)}
                    size="sm"
                />
            </p>
            <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground min-w-0 mt-0.5">
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
                <span class="opacity-50">·</span>
                <span class="whitespace-nowrap">{formatDate(expense.date)}</span>
            </div>
        </div>

        <DropdownMenu.Root>
            <DropdownMenu.Trigger
                class="p-1 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center shrink-0"
                aria-label="More actions"
                title="More"
            >
                <MoreVertical class="size-4" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" class="min-w-[11rem]">
                <DropdownMenu.Item onclick={() => onSelect?.(expense)}>
                    <Pencil class="size-3.5" />
                    <span>Edit</span>
                </DropdownMenu.Item>
                {#if onDelete}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item destructive onclick={() => onDelete?.(expense)}>
                        <Trash2 class="size-3.5" />
                        <span>Delete</span>
                    </DropdownMenu.Item>
                {/if}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </div>
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
