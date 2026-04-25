<script lang="ts">
    import {goto} from "$app/navigation";
    import {page} from "$app/state";
    import {useSearchParams} from "runed/kit";
    import {ofetch} from "ofetch";
    import {resource} from "runed";
    import * as v from 'valibot';
    import type {VaultWithMember} from "$lib/schemas/read/vaultWithMember";
    import {Button} from "$lib/components/ui/button";
    import {Card, CardContent} from "$lib/components/ui/card";
    import {LoadingOverlay} from "$lib/components/ui/loading-overlay";
    import {FloatingActionButton} from "$lib/components/ui/floating-action-button";
    import type {Expense, VaultStatistics} from "../types";
    import FilterChipsDrawer from "./FilterChipsDrawer.svelte";
    import DateFilterTabs from "./DateFilterTabs.svelte";
    import FilterTypeTabs from "./FilterTypeTabs.svelte";
    import CurrentFilterChip from "./CurrentFilterChip.svelte";
    import CalendarSection from "./CalendarSection.svelte";
    import { BreakdownBars, type BreakdownRow } from "$lib/components/ui/breakdown-bars";
    import {
        groupExpensesByDate,
        formatDate,
        getDateFilterLabel
    } from "./utils";
    import { createVaultFormatters } from "$lib/vaultFormatting";
    import {type DateFilter, getDateRangeFromCalendar} from "$lib/utils";
    import {now, getLocalTimeZone, CalendarDate} from "@internationalized/date";
    import type {DateRange} from "bits-ui";

    let {vaultId} = page.params

    // Schema for statistics page query params
    const statisticsParamsSchema = v.object({
        filterType: v.optional(v.picklist(['template', 'category', 'member', 'tag']), 'template'),
        filter: v.optional(v.picklist(['today', 'yesterday', 'week', 'month', 'year']), 'month'),
        filterName: v.optional(v.fallback(v.string(), ""), ""),
        startDate: v.optional(v.fallback(v.string(), ""), ""),
        endDate: v.optional(v.fallback(v.string(), ""), ""),
    });

    const params = useSearchParams(statisticsParamsSchema);

    // Refetch keys
    let refetchKey = $state(0);
    let vaultRefetchKey = $state(0);

    // Drawer state for filter selection
    let filterDrawerOpen = $state(false);

    // Calendar value - initialize to current month
    const today = now(getLocalTimeZone());
    let calendarValue = $state<DateRange | undefined>({
        start: today,
        end: today,
    });

    // Calendar placeholder - tracks the currently displayed month in the calendar
    // Start as undefined to prevent double-fetch on mount
    let calendarPlaceholder = $state<CalendarDate | undefined>(undefined);

    // Derived filter values
    let filterType = $derived(params.filterType || 'template');
    let filter = $state<DateFilter>(params.filter || 'all');
    let filterName = $derived(params.filterName);

    // Update dateFilter when params change
    $effect(() => {
        filter = (params.filter as DateFilter) || 'all';
    });

    // Label used in the header — honors a manual calendar range over the pill.
    const activeRangeLabel = $derived.by(() => {
        const hasCustomRange = params.startDate && params.endDate;
        if (hasCustomRange) {
            try {
                const fmt = (s: string) =>
                    new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                return `${fmt(params.startDate)} – ${fmt(params.endDate)}`;
            } catch {
                return getDateFilterLabel(filter);
            }
        }
        return getDateFilterLabel(filter);
    });

    // Initialize calendar from URL params or preset filter on mount
    let isInitialized = $state(false);

    $effect(() => {
        if (isInitialized) return;

        const now = new Date();

        // If we have URL params for dates, use them
        if (params.startDate && params.endDate) {
            try {
                const start = new Date(params.startDate);
                const end = new Date(params.endDate);

                calendarValue = {
                    start: new CalendarDate(start.getFullYear(), start.getMonth() + 1, start.getDate()),
                    end: new CalendarDate(end.getFullYear(), end.getMonth() + 1, end.getDate())
                };
                // Set placeholder to the start date's month
                calendarPlaceholder = new CalendarDate(start.getFullYear(), start.getMonth() + 1, 1);
            } catch (e) {
                console.error('Failed to parse dates from params', e);
            }
        } else {
            // Otherwise use preset filter
            switch (filter) {
                case 'today': {
                    const todayDate = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
                    calendarValue = { start: todayDate, end: todayDate };
                    calendarPlaceholder = new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1);
                    break;
                }
                case 'week': {
                    const dayOfWeek = now.getDay();
                    const start = new Date(now);
                    start.setDate(now.getDate() - dayOfWeek);
                    const end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    calendarValue = {
                        start: new CalendarDate(start.getFullYear(), start.getMonth() + 1, start.getDate()),
                        end: new CalendarDate(end.getFullYear(), end.getMonth() + 1, end.getDate())
                    };
                    calendarPlaceholder = new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1);
                    break;
                }
                case 'month': {
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    calendarValue = {
                        start: new CalendarDate(firstDay.getFullYear(), firstDay.getMonth() + 1, firstDay.getDate()),
                        end: new CalendarDate(lastDay.getFullYear(), lastDay.getMonth() + 1, lastDay.getDate())
                    };
                    calendarPlaceholder = new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1);
                    break;
                }
                case 'year': {
                    calendarValue = {
                        start: new CalendarDate(now.getFullYear(), 1, 1),
                        end: new CalendarDate(now.getFullYear(), 12, 31)
                    };
                    calendarPlaceholder = new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1);
                    break;
                }
                default: {
                    const todayDate = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
                    calendarValue = { start: todayDate, end: todayDate };
                    calendarPlaceholder = new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1);
                }
            }
        }

        isInitialized = true;
    });

    // When date filter button is clicked, update calendar
    let lastDateFilter = $state(filter);
    $effect(() => {
        if (!isInitialized) return;
        if (filter === lastDateFilter) return;

        lastDateFilter = filter;
        const now = new Date();

        switch (filter) {
            case 'today': {
                const todayDate = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
                calendarValue = { start: todayDate, end: todayDate };
                break;
            }
            case 'week': {
                const dayOfWeek = now.getDay();
                const start = new Date(now);
                start.setDate(now.getDate() - dayOfWeek);
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                calendarValue = {
                    start: new CalendarDate(start.getFullYear(), start.getMonth() + 1, start.getDate()),
                    end: new CalendarDate(end.getFullYear(), end.getMonth() + 1, end.getDate())
                };
                break;
            }
            case 'month': {
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                calendarValue = {
                    start: new CalendarDate(firstDay.getFullYear(), firstDay.getMonth() + 1, firstDay.getDate()),
                    end: new CalendarDate(lastDay.getFullYear(), lastDay.getMonth() + 1, lastDay.getDate())
                };
                break;
            }
            case 'year': {
                calendarValue = {
                    start: new CalendarDate(now.getFullYear(), 1, 1),
                    end: new CalendarDate(now.getFullYear(), 12, 31)
                };
                break;
            }
            case 'all': {
                const todayDate = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
                calendarValue = { start: todayDate, end: todayDate };
                break;
            }
        }
    });

    // Update URL params when calendar value changes (but not during initialization)
    let lastCalendarValue: string | undefined = $state();
    $effect(() => {
        if (!isInitialized || !calendarValue?.start || !calendarValue?.end) return;

        const currentValue = `${calendarValue.start.year}-${calendarValue.start.month}-${calendarValue.start.day}_${calendarValue.end.year}-${calendarValue.end.month}-${calendarValue.end.day}`;

        if (currentValue === lastCalendarValue) return;
        lastCalendarValue = currentValue;

        const start = new Date(calendarValue.start.year, calendarValue.start.month - 1, calendarValue.start.day);
        const end = new Date(calendarValue.end.year, calendarValue.end.month - 1, calendarValue.end.day);

        params.update({
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            filterName: filterName || "",
            filterType: filterType || "template"
        })
    });

    // Resource for vault data
    const vaultResource = resource(
        () => [vaultId, vaultRefetchKey] as const,
        async ([id]) => {
            const response = await ofetch<{ success: boolean, data: VaultWithMember }>(`/api/getVault?vaultId=${id}`);
            return response.data;
        }
    );

    // Track last fetched month to prevent duplicate calls
    let lastFetchedMonth = $state<string | null>(null);

    // Resource for ALL expenses (for calendar daily totals - independent of filter)
    const allExpensesResource = resource(
        () => {
            if (!calendarPlaceholder?.year || !calendarPlaceholder?.month) return null;
            return [vaultId, calendarPlaceholder.year, calendarPlaceholder.month, refetchKey] as const;
        },
        async (deps) => {
            // Skip fetch if calendar placeholder is not initialized yet
            if (!deps) return [];

            const [id, year, month] = deps;

            // Check if we've already fetched this month to prevent duplicates
            const monthKey = `${year}-${month}`;
            if (monthKey === lastFetchedMonth && refetchKey === 0) {
                return allExpensesResource.current || [];
            }
            lastFetchedMonth = monthKey;

            // Calculate 1 month before the currently displayed calendar month
            const prevMonthDate = new Date(year, month - 2, 1); // month - 2 because months are 0-based and we want previous month
            const prev = {
                year: prevMonthDate.getFullYear(),
                month: prevMonthDate.getMonth() + 1, // +1 because months are 0-based
                day: 1
            };

            // Calculate 1 month after the currently displayed calendar month (last day of that month)
            const nextMonthDate = new Date(year, month, 1); // month is already 1-based, so this gives us next month
            const lastDayNextMonth = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0);
            const next = {
                year: lastDayNextMonth.getFullYear(),
                month: lastDayNextMonth.getMonth() + 1,
                day: lastDayNextMonth.getDate()
            };

            const dateRange = getDateRangeFromCalendar({
                start: prev,
                end: next,
            });
            const urlParams = new URLSearchParams({
                vaultId: id,
                page: '1',
                limit: '1000', // Get all expenses,
                startDate: dateRange.startDate!,
                endDate: dateRange.endDate!
            });

            const response = await ofetch<{ expenses: Expense[], pagination: any }>(`/api/getExpenses?${urlParams.toString()}`);
            return response.expenses || [];
        }
    );

    // Resource for filtered expenses - reactive to calendar selection
    const expensesResource = resource(
        () => [vaultId, calendarValue?.start, calendarValue?.end, filter, refetchKey] as const,
        async ([id, calStart, calEnd, dateF]) => {
            if(!calEnd || !calStart) return [];
            const urlParams = new URLSearchParams({
                vaultId: id,
                page: '1',
                limit: '1000'
            });

            // Use calendar value for date filtering (synced with date filter buttons)
            if (dateF !== 'all') {
                const dateRange = getDateRangeFromCalendar(calendarValue);
                if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
                if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);
            }

            urlParams.append('filterName', params.filterName || '');
            urlParams.append('filterType', params.filterType || 'template');

            const response = await ofetch<{ expenses: Expense[], pagination: any }>(`/api/getExpenses?${urlParams.toString()}`);
            return response.expenses || [];
        }
    );

    // Resource for overall statistics - reactive to calendar selection
    const statisticsResource = resource(
        () => [vaultId, calendarValue?.start, calendarValue?.end, filter, refetchKey] as const,
        async ([id, calStart, calEnd, dateF]) => {
            if(calEnd === undefined) return null;
            const urlParams = new URLSearchParams({vaultId: id});

            // Use calendar value for date filtering (synced with date filter buttons)
            if (dateF !== 'all') {
                const dateRange = getDateRangeFromCalendar(calendarValue);
                if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
                if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);
            }

            const response = await ofetch<{ success: boolean, data: VaultStatistics }>(`/api/getVaultStatistics?${urlParams.toString()}`);
            return response.data;
        }
    );

    // Derive data from resources
    const currentVault = $derived(vaultResource.current);
    const allExpenses = $derived(allExpensesResource.current || []); // For calendar daily totals
    const filteredExpensesList = $derived(expensesResource.current || []); // For the filtered list
    const statistics = $derived(statisticsResource.current || null);
    const isLoadingVault = $derived(vaultResource.loading);
    const isLoadingExpenses = $derived(expensesResource.loading);
    const isLoadingStats = $derived(statisticsResource.loading);

    const vaultFormatters = $derived(
        createVaultFormatters({
            locale: currentVault?.vaults.locale || 'en-US',
            currency: currentVault?.vaults.currency || 'USD',
        }),
    );
    const formatCurrency = $derived(vaultFormatters.currency);

    // Derive filterId from filterName and statistics data
    const filterId = $derived.by(() => {
        if (!filterName || !statistics) return undefined;

        switch (filterType) {
            case 'template': {
                const template = statistics.byTemplate.find(t => t.templateName === filterName);
                return template?.templateId;
            }
            case 'member': {
                const member = statistics.byMember.find(m => m.displayName === filterName);
                return member?.userId;
            }
            case 'tag': {
                const tag = statistics.byTag.find(t => t.tagName === filterName);
                return tag?.tagId;
            }
            case 'category':
                // Categories use name directly, no ID needed
                return undefined;
            default:
                return undefined;
        }
    });

    // Get all available filter options for chips
    const filterOptions = $derived.by(() => {
        if (!statistics) return [];

        switch (filterType) {
            case 'template':
                return statistics.byTemplate.map(item => ({
                    id: String(item.templateId || 'no-template'),
                    name: item.name || item.templateName,
                    icon: item.templateIcon || '📝',
                    count: item.count
                }));
            case 'category':
                return statistics.byCategory.map(item => ({
                    id: item.categoryName,
                    name: item.categoryName,
                    icon: '🏷️',
                    count: item.count
                }));
            case 'member':
                return statistics.byMember.map(item => ({
                    id: item.userId,
                    name: item.displayName,
                    icon: '👤',
                    count: item.count
                }));
            case 'tag':
                return statistics.byTag.map(item => ({
                    id: item.tagId,
                    name: item.tagName,
                    icon: '🏷️',
                    count: item.count
                }));
            default:
                return [];
        }
    });

    // Helper function to filter expenses by category/template/member
    function filterByType(expenses: Expense[]) {
        const currentFilterType = filterType;
        const currentFilterName = filterName;
        const currentFilterId = filterId;

        if (!currentFilterName) return expenses;

        switch (currentFilterType) {
            case 'category':
                return expenses.filter(expense => expense.category?.name === currentFilterName);
            case 'template':
                if (currentFilterId) {
                    return expenses.filter(expense =>
                        String(expense.templateId) === String(currentFilterId)
                    );
                }
                return expenses;
            case 'member':
                if (currentFilterId) {
                    return expenses.filter(expense => expense.paidBy === currentFilterId);
                }
                return expenses;
            case 'tag':
                if (currentFilterId) {
                    return expenses.filter((expense) =>
                        Array.isArray(expense.tags) && expense.tags.some((t) => t.id === currentFilterId)
                    );
                }
                return expenses;
            default:
                return expenses;
        }
    }

    // Filter all expenses by category/template/member (for calendar totals)
    const allExpensesFiltered = $derived.by(() => filterByType(allExpenses));

    // Filter date-filtered expenses by category/template/member (for expense list)
    const filteredExpenses = $derived.by(() => filterByType(filteredExpensesList));

    const allExpensesByDate = $derived(groupExpensesByDate(filteredExpenses));

    // Calculate total based on filtered expenses
    const filteredTotal = $derived.by(() => {
        const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const count = filteredExpenses.length;
        return {amount: total, count};
    });

    function handleDeleteExpense(expenseId: string) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        ofetch('/api/deleteExpense', {
            method: 'POST',
            body: JSON.stringify({id: expenseId, vaultId}),
            headers: {'Content-Type': 'application/json'}
        }).then(() => {
            refetchKey++;
        }).catch((error) => {
            console.error('Failed to delete expense:', error);
            alert('Failed to delete expense. Please try again.');
        });
    }

    function handleEditExpense(expenseId: string) {
        goto(`/vaults/${vaultId}/expenses/${expenseId}/edit`);
    }

    function handleBack() {
        goto(`/vaults/${vaultId}`);
    }

    // Rows for the BreakdownBars component, switching data set by filter type.
    const breakdownRows = $derived.by<BreakdownRow[]>(() => {
        if (!statistics) return [];
        switch (filterType) {
            case 'category':
                return statistics.byCategory.map((c) => ({
                    id: c.categoryName,
                    label: c.categoryName || 'Uncategorized',
                    icon: c.categoryIcon ?? null,
                    iconType: c.categoryIconType ?? null,
                    color: null,
                    value: c.totalAmount,
                    count: c.count,
                }));
            case 'template':
                return statistics.byTemplate.map((t) => ({
                    id: t.templateId,
                    label: t.templateName || 'No template',
                    icon: t.templateIcon ?? null,
                    color: null,
                    value: t.totalAmount,
                    count: t.count,
                }));
            case 'member':
                return statistics.byMember.map((m) => ({
                    id: m.userId,
                    label: m.displayName || 'Vault-level expense',
                    icon: null,
                    color: null,
                    value: m.totalAmount,
                    count: m.count,
                }));
            case 'tag':
                return statistics.byTag.map((t) => ({
                    id: t.tagId,
                    label: t.tagName,
                    icon: null,
                    color: t.tagColor ?? null,
                    value: t.totalAmount,
                    count: t.count,
                }));
            default:
                return [];
        }
    });

    // Clicking a bar → drill down to the expense list, pre-filtered by search.
    function navigateToExpenses(label: string) {
        const qs = new URLSearchParams();
        qs.set('filter', filter);
        if (filter === 'custom' && params.startDate && params.endDate) {
            qs.set('startDate', params.startDate);
            qs.set('endDate', params.endDate);
        }
        goto(`/vaults/${vaultId}/expenses?${qs.toString()}`);
    }
</script>

<svelte:head>
    <title>Statistics - {currentVault?.vaults.name || 'Vault'} - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-4 px-4">
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
        <LoadingOverlay show={isLoadingStats || isLoadingExpenses} />

        <!-- Header -->
        <div class="mb-4">
            <p class="text-xs text-muted-foreground mt-1">Expense breakdown for {activeRangeLabel}</p>
        </div>

        <!-- Date Filter Tabs + inline Filter trigger -->
        <div class="flex items-center justify-between gap-2 flex-wrap">
            <DateFilterTabs
                currentFilter={filter}
                onFilterChange={(filter) => params.filter = filter}
            />
            {#if statistics && filterOptions.length > 1}
                <Button variant="outline" size="sm" onclick={() => filterDrawerOpen = true}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
                    </svg>
                    Filter
                    {#if filterName}
                        <span class="ml-1 text-xs font-normal opacity-70">· {filterName}</span>
                    {/if}
                </Button>
            {/if}
        </div>

        <!-- Calendar Section -->
        <CalendarSection
            bind:value={calendarValue}
            bind:placeholder={calendarPlaceholder}
            allExpenses={allExpensesFiltered}
            onValueChange={(value) => calendarValue = value}
        />

        <!-- Total Card -->
        {#if statistics}
            <Card class="mb-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent class="py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-baseline gap-3">
                            <h2 class="text-md font-bold">{formatCurrency(filteredTotal.amount)}</h2>
                            <p class="text-xs text-muted-foreground">({filteredTotal.count} transaction{filteredTotal.count !== 1 ? 's' : ''})</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Current Filter Display -->
            <CurrentFilterChip
                filterType={filterType}
                filterName={filterName || ''}
                filterOptions={filterOptions}
                onClear={() => params.filterName = ""}
            />

            <!-- Filter Type Tabs -->
            <FilterTypeTabs
                currentType={filterType}
                onTypeChange={(type) => {
                    params.filterType = type;
                    params.filterName = "";
                }}
            />

            <!-- Breakdown bars for the current view type -->
            <BreakdownBars
                rows={breakdownRows}
                limit={5}
                formatCurrency={formatCurrency}
                emptyTitle={`No ${filterType} data for this range.`}
                onSelect={(row) => navigateToExpenses(row.label)}
            />
        {/if}
    {/if}
</div>

<!-- Filter Selection FAB -->
{#if statistics && filterOptions.length > 1}
    <!-- Filter Selection Drawer -->
    <FilterChipsDrawer
        bind:open={filterDrawerOpen}
        filterOptions={filterOptions}
        selectedName={filterName}
        allExpensesCount={filteredExpensesList.length}
        filterType={filterType}
        onOpenChange={(open) => filterDrawerOpen = open}
        onSelectAll={() => { params.filterName = ""; filterDrawerOpen = false; }}
        onSelectOption={(name) => { params.filterName = name; filterDrawerOpen = false; }}
    />
{/if}
