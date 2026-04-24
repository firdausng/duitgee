<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { useSearchParams } from 'runed/kit';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { isToday, isYesterday } from 'date-fns';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Amount } from '$lib/components/ui/amount';
    import { EmptyState } from '$lib/components/ui/empty-state';
    import { FilterPill, AddFilterPopover } from '$lib/components/ui/filter-pill';
    import { DateRangeFilter } from '$lib/components/ui/date-range-filter';
    import { localDatetimeToUtcIso, getDateRange, type DateFilter } from '$lib/utils';
    import { createVaultFormatters } from '$lib/vaultFormatting';
    import { groupExpensesByDay } from '$lib/utils/groupExpensesByDay';
    import { filterSchema } from './schemas';
    import {
        decodePills,
        writePillsToSearchParams,
        type FilterPill as FilterPillData,
    } from '$lib/filters/filter-types';
    import { applyFilters } from '$lib/filters/filter-eval';
    import { paymentTypes } from '$lib/configurations/paymentTypes';
    import { categoryData } from '$lib/configurations/categories';
    import Search from '@lucide/svelte/icons/search';
    import Plus from '@lucide/svelte/icons/plus';
    import Receipt from '@lucide/svelte/icons/receipt';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import Filter from '@lucide/svelte/icons/filter';
    import X from '@lucide/svelte/icons/x';
    import CalendarDays from '@lucide/svelte/icons/calendar-days';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';

    const GROUP_BY_DAY_STORAGE_KEY = 'dg:expenses:groupByDay';

    let { data } = $props();
    let { vaultId, vault } = data;
    const vaultFunds = $derived(data.funds ?? []);
    const vaultMembers = $derived(data.members ?? []);

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
        recurringExpenseId: string | null;
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

    // Filter pills — parsed from the URL's repeated ?f= params.
    const pills = $derived<FilterPillData[]>(decodePills(page.url.searchParams));

    // Options for the AddFilterPopover. Sourced from stable references so the
    // popover shows the full universe of filterable values regardless of what's
    // currently rendered below (which may be narrowed to zero by a date filter).
    //   - category: static config
    //   - fund: loaded in +page.server.ts from /api/getFunds
    //   - paidBy: loaded in +page.server.ts from /api/getVault members
    //   - paymentType: static config
    const filterOptions = $derived({
        category: categoryData.categories
            .map((c) => c.name)
            .sort((a, b) => a.localeCompare(b)),
        fund: [...vaultFunds].sort((a, b) => a.name.localeCompare(b.name)),
        paidBy: vaultMembers
            .map((m) => ({ id: m.userId, name: m.displayName }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        paymentType: paymentTypes.map((p) => ({ value: p.value, label: p.label, icon: p.icon })),
    });

    function writePills(next: FilterPillData[]) {
        const params = new URLSearchParams(page.url.searchParams);
        writePillsToSearchParams(params, next);
        goto(`${page.url.pathname}?${params.toString()}`, { replaceState: true, noScroll: true, keepFocus: true });
    }

    function addPill(pill: FilterPillData) {
        // If a filter on the same field already exists, replace it (Kibana
        // default behaviour — each field has one active filter unless the user
        // explicitly duplicates; for v1 one-per-field is simpler).
        const next = pills.filter((p) => p.field !== pill.field).concat(pill);
        writePills(next);
    }

    function removePill(pill: FilterPillData) {
        writePills(pills.filter((p) => p !== pill));
    }

    let editingPill = $state<FilterPillData | null>(null);

    function updatePill(pill: FilterPillData) {
        // Replace the pill currently being edited.
        if (!editingPill) {
            addPill(pill);
            return;
        }
        const idx = pills.findIndex((p) => p === editingPill);
        const next = [...pills];
        if (idx === -1) {
            next.push(pill);
        } else {
            next[idx] = pill;
        }
        writePills(next);
        editingPill = null;
    }

    function displayValueFor(pill: FilterPillData): string {
        if (pill.field === 'amount') {
            if (pill.op === 'between') return `${fmt.currency(Number(pill.values[0] ?? 0))} – ${fmt.currency(Number(pill.values[1] ?? 0))}`;
            return fmt.currency(Number(pill.values[0] ?? 0));
        }
        if (pill.field === 'fund') {
            return pill.values
                .map((v) => (v === '__none__' ? 'No fund' : filterOptions.fund.find((f) => f.id === v)?.name ?? v))
                .join(', ');
        }
        if (pill.field === 'paidBy') {
            return pill.values
                .map((v) => (v === '__vault__' ? 'Vault-level' : filterOptions.paidBy.find((m) => m.id === v)?.name ?? v))
                .join(', ');
        }
        if (pill.field === 'paymentType') {
            return pill.values
                .map((v) => paymentTypes.find((p) => p.value === v)?.label ?? v)
                .join(', ');
        }
        return pill.values.join(', ');
    }

    const hasAnyFilter = $derived(
        pills.length > 0 || !!searchQuery.trim() || (filterType && filterType !== 'all'),
    );

    function clearAllFilters() {
        searchQuery = '';
        params.filter = 'all';
        params.startDate = '';
        params.endDate = '';
        writePills([]);
    }

    // Client-side search + pill filter (on top of server-side date filter)
    const visibleExpenses = $derived.by(() => {
        const afterPills = applyFilters(expenses, pills);
        if (!searchQuery.trim()) return afterPills;
        const q = searchQuery.toLowerCase();
        return afterPills.filter((e) => {
            const note = (e.note ?? '').toLowerCase();
            const cat = e.category?.name?.toLowerCase() ?? '';
            const fund = (e.fundName ?? '').toLowerCase();
            const payer = (e.paidByName ?? '').toLowerCase();
            return note.includes(q) || cat.includes(q) || fund.includes(q) || payer.includes(q);
        });
    });

    function handleDateRangeChange(next: {
        filter: DateFilter;
        startDate?: string;
        endDate?: string;
    }) {
        params.filter = next.filter;
        params.startDate = next.startDate ?? '';
        params.endDate = next.endDate ?? '';
    }

    function handleCreateExpense() {
        const returnTo = page.url.pathname + page.url.search;
        const qs = new URLSearchParams({ returnTo });
        goto(`/vaults/${vaultId}/expenses/new?${qs.toString()}`);
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

    // Group-by-day toggle (persisted in localStorage, shared across vaults)
    let groupByDay = $state(false);

    onMount(() => {
        groupByDay = localStorage.getItem(GROUP_BY_DAY_STORAGE_KEY) === 'true';
    });

    function toggleGroupByDay() {
        groupByDay = !groupByDay;
        localStorage.setItem(GROUP_BY_DAY_STORAGE_KEY, String(groupByDay));
    }

    const dayGroups = $derived(groupByDay ? groupExpensesByDay(visibleExpenses) : []);

    function dayLabel(dayStart: Date): string {
        if (isToday(dayStart)) return 'Today';
        if (isYesterday(dayStart)) return 'Yesterday';
        return fmt.date(dayStart.toISOString());
    }
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

    <!-- Search + add filter + date pills + clear -->
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
        <AddFilterPopover
            options={filterOptions}
            editing={editingPill}
            onApply={updatePill}
        >
            {#snippet trigger({ toggle, open })}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onclick={toggle}
                    aria-expanded={open}
                >
                    <Filter class="size-3.5" />
                    Add filter
                </Button>
            {/snippet}
        </AddFilterPopover>
        <DateRangeFilter
            value={filterType}
            startDate={params.startDate}
            endDate={params.endDate}
            onChange={handleDateRangeChange}
        />
        <Button
            type="button"
            variant={groupByDay ? 'default' : 'outline'}
            size="sm"
            onclick={toggleGroupByDay}
            aria-pressed={groupByDay}
            title={groupByDay ? 'Turn off day grouping' : 'Group by day'}
        >
            <CalendarDays class="size-3.5" />
            <span class="hidden sm:inline">Group by day</span>
        </Button>
        {#if hasAnyFilter}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onclick={clearAllFilters}
                class="text-muted-foreground hover:text-foreground"
            >
                <X class="size-3.5" />
                Clear
            </Button>
        {/if}
    </div>

    <!-- Active filter pills -->
    {#if pills.length > 0}
        <div class="flex flex-wrap gap-1.5">
            {#each pills as pill (pill.field + pill.op + pill.values.join(','))}
                <FilterPill
                    {pill}
                    displayValue={displayValueFor(pill)}
                    onEdit={() => {
                        editingPill = pill;
                        // Re-open the popover via a tiny delay so the parent
                        // renders the updated `editing` prop before opening.
                        setTimeout(() => {
                            const trigger = document.querySelector<HTMLButtonElement>('button[aria-expanded]');
                            trigger?.click();
                        }, 0);
                    }}
                    onRemove={() => removePill(pill)}
                />
            {/each}
        </div>
    {/if}

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
                {@const hasSearch = !!searchQuery.trim()}
                {@const hasPills = pills.length > 0}
                {@const hasDateRange = filterType && filterType !== 'all'}
                {@const description = hasSearch
                    ? `Nothing matches "${searchQuery}" in the current view.`
                    : hasPills && hasDateRange
                    ? 'Nothing matches the current filters and date range.'
                    : hasPills
                    ? 'Nothing matches the current filters.'
                    : 'Nothing in this date range.'}
                <EmptyState
                    icon={Search}
                    title="No matches"
                    {description}
                >
                    {#snippet secondary()}
                        {#if hasSearch}
                            <Button variant="outline" size="sm" onclick={() => (searchQuery = '')}>
                                Clear search
                            </Button>
                        {:else if hasPills || hasDateRange}
                            <Button variant="outline" size="sm" onclick={clearAllFilters}>
                                Clear filters
                            </Button>
                        {/if}
                    {/snippet}
                    {#snippet primary()}
                        {#if hasDateRange}
                            <Button size="sm" onclick={() => setFilter('all')}>
                                <ArrowRight class="size-4" />
                                Show all time
                            </Button>
                        {/if}
                    {/snippet}
                </EmptyState>
            {/if}
        </div>
    {:else if groupByDay}
        <div class="flex flex-col gap-4">
            {#each dayGroups as group (group.dayKey)}
                <div>
                    <div class="flex items-center justify-between gap-3 px-1 pb-1.5">
                        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {dayLabel(group.dayStartLocal)}
                        </span>
                        <span class="text-xs text-muted-foreground whitespace-nowrap">
                            {group.count} {group.count === 1 ? 'entry' : 'entries'}
                            · <span class="font-mono">{fmt.currency(group.total)}</span>
                        </span>
                    </div>
                    <div class="border rounded-[var(--radius-md)] bg-card divide-y divide-border overflow-hidden">
                        {#each group.items as expense (expense.id)}
                            {@render expenseRow(expense)}
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="border rounded-[var(--radius-md)] bg-card divide-y divide-border overflow-hidden">
            {#each visibleExpenses as expense (expense.id)}
                {@render expenseRow(expense)}
            {/each}
        </div>
    {/if}
</div>

{#snippet expenseRow(expense: Expense)}
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
            <!-- Title on its own full-width row -->
            <p class="font-medium break-words">
                {expense.note || expense.category?.name || 'Expense'}
                {#if expense.recurringExpenseId}
                    <RefreshCw
                        class="inline-block size-3 text-muted-foreground align-middle ml-1 shrink-0"
                        aria-label="From recurring rule"
                    />
                {/if}
            </p>
            <!-- Meta on left, amount + date stacked on right -->
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
                        value={isNegative ? -expense.amount : expense.amount}
                        sign="negative"
                        showSign={false}
                        formatted={fmt.currency(expense.amount)}
                        size="sm"
                    />
                    <span class="text-xs text-muted-foreground whitespace-nowrap">
                        {fmt.date(expense.date)}
                    </span>
                </div>
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
{/snippet}

<style>
    /* Make hover-action buttons visible on touch devices too. */
    @media (hover: none) {
        :global(.group .opacity-0) {
            opacity: 1;
        }
    }
</style>
