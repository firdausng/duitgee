<script lang="ts">
    import { goto } from '$app/navigation';
    import { useSearchParams } from 'runed/kit';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Amount } from '$lib/components/ui/amount';
    import { EmptyState } from '$lib/components/ui/empty-state';
    import { localDatetimeToUtcIso, getDateRange, type DateFilter } from '$lib/utils';
    import { createVaultFormatters } from '$lib/vaultFormatting';
    import { filterSchema } from './schemas';
    import Search from '@lucide/svelte/icons/search';
    import Plus from '@lucide/svelte/icons/plus';
    import Receipt from '@lucide/svelte/icons/receipt';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';

    let { data } = $props();
    let { vaultId, vault } = data;

    const fmt = createVaultFormatters({
        locale: vault?.locale || 'en-US',
        currency: vault?.currency || 'USD',
    });

    type Expense = {
        id: string;
        note: string | null;
        amount: number;
        paymentType: string;
        category: {
            name: string;
            icon: string;
            color: string;
        } | null;
        paidBy: string | null;
        paidByName: string | null;
        fundId: string | null;
        fundName: string | null;
        fundIcon: string | null;
        date: string;
    };

    const params = useSearchParams(filterSchema);

    let refetchKey = $state(0);
    let searchQuery = $state('');
    let filterType = $derived(params.filter as DateFilter);

    function getDateRangeWithCustom(): { startDate?: string; endDate?: string } {
        if (filterType === 'custom' && params.startDate && params.endDate) {
            return {
                startDate: localDatetimeToUtcIso(params.startDate),
                endDate: localDatetimeToUtcIso(params.endDate),
            };
        }
        return getDateRange(filterType);
    }

    const expensesResource = resource(
        () => [vaultId, filterType, params.startDate, params.endDate, refetchKey] as const,
        async ([id]) => {
            const dateRange = getDateRangeWithCustom();
            const urlParams = new URLSearchParams({ vaultId: id, page: '1', limit: '200' });
            if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
            if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);
            const response = await ofetch<{ expenses: Expense[]; pagination: unknown }>(
                `/api/getExpenses?${urlParams.toString()}`,
            );
            return response.expenses || [];
        },
    );

    const expenses = $derived(expensesResource.current || []);
    const isLoading = $derived(expensesResource.loading);

    // Client-side search filter (on top of server-side date filter)
    const visibleExpenses = $derived.by(() => {
        if (!searchQuery.trim()) return expenses;
        const q = searchQuery.toLowerCase();
        return expenses.filter((e) => {
            const note = (e.note ?? '').toLowerCase();
            const cat = e.category?.name?.toLowerCase() ?? '';
            const fund = (e.fundName ?? '').toLowerCase();
            const payer = (e.paidByName ?? '').toLowerCase();
            return note.includes(q) || cat.includes(q) || fund.includes(q) || payer.includes(q);
        });
    });

    const filterTabs: { id: DateFilter; label: string }[] = [
        { id: 'today', label: 'Today' },
        { id: 'week', label: 'Week' },
        { id: 'month', label: 'Month' },
        { id: 'year', label: 'Year' },
        { id: 'all', label: 'All' },
    ];

    function setFilter(next: DateFilter) {
        params.filter = next;
    }

    function handleCreateExpense() {
        goto(`/vaults/${vaultId}/expenses/new`);
    }

    function handleEditExpense(expenseId: string) {
        goto(`/vaults/${vaultId}/expenses/${expenseId}/edit`);
    }

    async function handleDeleteExpense(expenseId: string) {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            await ofetch('/api/deleteExpense', {
                method: 'POST',
                body: JSON.stringify({ id: expenseId, vaultId }),
                headers: { 'Content-Type': 'application/json' },
            });
            refetchKey++;
        } catch (error) {
            console.error('Failed to delete expense:', error);
            alert('Failed to delete expense. Please try again.');
        }
    }

    function formatDayAndTime(dateString: string): string {
        const d = new Date(dateString);
        return `${fmt.date(dateString)} · ${d.toLocaleTimeString(fmt.getLocale(), { hour: 'numeric', minute: '2-digit' })}`;
    }

    // Total of currently visible expenses
    const visibleTotal = $derived(visibleExpenses.reduce((sum, e) => sum + e.amount, 0));
</script>

<svelte:head>
    <title>Expenses - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-4 md:py-8 px-4 space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3">
        <div>
            <h1 class="text-2xl md:text-3xl font-bold">Expenses</h1>
            <p class="text-xs md:text-sm text-muted-foreground mt-1">
                {visibleExpenses.length.toLocaleString()} {visibleExpenses.length === 1 ? 'entry' : 'entries'}
                · <span class="font-mono">{fmt.currency(visibleTotal)}</span>
            </p>
        </div>
        <Button onclick={handleCreateExpense} size="sm">
            <Plus class="size-4" />
            <span class="hidden md:inline">Add Expense</span>
        </Button>
    </div>

    <!-- Search + date filters -->
    <div class="flex flex-col md:flex-row md:items-center gap-2">
        <div class="relative flex-1 md:max-w-xs">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search description, category, fund, payer..."
                bind:value={searchQuery}
                class="pl-8"
            />
        </div>
        <div class="flex flex-wrap gap-1.5">
            {#each filterTabs as tab}
                {@const active = filterType === tab.id}
                <button
                    type="button"
                    onclick={() => setFilter(tab.id)}
                    class="px-3 h-8 rounded-[var(--radius-sm)] text-sm transition-colors border {active ? 'bg-primary text-primary-foreground border-primary font-medium' : 'bg-transparent text-muted-foreground border-border hover:bg-muted'}"
                >
                    {tab.label}
                </button>
            {/each}
        </div>
    </div>

    <!-- List -->
    {#if isLoading}
        <div class="flex justify-center py-12">
            <div class="animate-spin rounded-full size-10 border-b-2 border-primary"></div>
        </div>
    {:else if visibleExpenses.length === 0}
        <div class="border rounded-[var(--radius-md)] bg-card">
            {#if expenses.length === 0}
                <EmptyState
                    icon={Receipt}
                    title="No expenses yet"
                    description="Log your first expense to start tracking."
                >
                    {#snippet primary()}
                        <Button onclick={handleCreateExpense} size="sm">
                            <Plus class="size-4" />
                            Add expense
                        </Button>
                    {/snippet}
                </EmptyState>
            {:else}
                <EmptyState
                    icon={Search}
                    title="No matches"
                    description={`Nothing matches "${searchQuery}" in the current range.`}
                >
                    {#snippet secondary()}
                        <Button variant="outline" size="sm" onclick={() => (searchQuery = '')}>
                            Clear search
                        </Button>
                    {/snippet}
                    {#snippet primary()}
                        <Button size="sm" onclick={() => setFilter('all')}>
                            <ArrowRight class="size-4" />
                            Show all time
                        </Button>
                    {/snippet}
                </EmptyState>
            {/if}
        </div>
    {:else}
        <div class="border rounded-[var(--radius-md)] bg-card divide-y divide-border overflow-hidden">
            {#each visibleExpenses as expense (expense.id)}
                {@const isNegative = expense.amount > 0}
                <div class="group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors">
                    <!-- Category icon -->
                    <span
                        class="text-xl leading-none shrink-0 select-none"
                        style={expense.category?.color ? `background: ${expense.category.color}15; padding: 6px; border-radius: var(--radius-sm);` : ''}
                        aria-hidden="true"
                    >
                        {expense.category?.icon ?? '📝'}
                    </span>

                    <!-- Middle: description + metadata -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-baseline justify-between gap-2">
                            <span class="font-medium truncate">
                                {expense.note || expense.category?.name || 'Expense'}
                            </span>
                            <Amount
                                value={isNegative ? -expense.amount : expense.amount}
                                sign="negative"
                                showSign={false}
                                formatted={fmt.currency(expense.amount)}
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
                            <span class="shrink-0 whitespace-nowrap">{formatDayAndTime(expense.date)}</span>
                        </div>
                    </div>

                    <!-- Actions (show on hover at md+, always visible on mobile) -->
                    <div class="flex gap-1 shrink-0 opacity-0 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onclick={() => handleEditExpense(expense.id)}
                            class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground"
                            aria-label="Edit"
                            title="Edit"
                        >
                            <Pencil class="size-3.5" />
                        </button>
                        <button
                            type="button"
                            onclick={() => handleDeleteExpense(expense.id)}
                            class="p-1.5 rounded-[var(--radius-sm)] hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            aria-label="Delete"
                            title="Delete"
                        >
                            <Trash2 class="size-3.5" />
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    /* Make hover-action buttons visible on touch devices too. */
    @media (hover: none) {
        :global(.group .opacity-0) {
            opacity: 1;
        }
    }
</style>
