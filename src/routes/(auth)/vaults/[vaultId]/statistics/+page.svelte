<script lang="ts">
    import {goto} from "$app/navigation";
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
    import ExpenseListByDate from "./ExpenseListByDate.svelte";
    import {
        getDateRange,
        groupExpensesByDate,
        formatCurrency,
        formatDate,
        getDateFilterLabel,
        type DateFilter
    } from "./utils";
    import {localDatetimeToUtcIso} from "$lib/utils";

    let {data} = $props();
    let {vaultId} = data;

    // Schema for statistics page query params
    const statisticsParamsSchema = v.object({
        filterType: v.optional(v.picklist(['template', 'category', 'member']), 'template'),
        dateFilter: v.optional(v.picklist(['all', 'today', 'week', 'month', 'year', 'custom']), 'all'),
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

    // Derived filter values
    let filterType = $derived(params.filterType || 'template');
    let dateFilter = $state<DateFilter>(params.dateFilter || 'all');
    let filterName = $derived(params.filterName);

    // Update dateFilter when params change
    $effect(() => {
        dateFilter = (params.dateFilter as DateFilter) || 'all';
    });

    // Resource for vault data
    const vaultResource = resource(
        () => [vaultId, vaultRefetchKey] as const,
        async ([id]) => {
            const response = await ofetch<{ success: boolean, data: VaultWithMember }>(`/api/getVault?vaultId=${id}`);
            return response.data;
        }
    );

    // Resource for all expenses (filtered by date only)
    const expensesResource = resource(
        () => [vaultId, dateFilter, params.startDate, params.endDate, refetchKey] as const,
        async ([id, dateF, startDate, endDate]) => {
            const dateRange = getDateRange(dateF as DateFilter,
                startDate ? localDatetimeToUtcIso(startDate) : undefined,
                endDate ? localDatetimeToUtcIso(endDate) : undefined
            );

            const urlParams = new URLSearchParams({
                vaultId: id,
                page: '1',
                limit: '1000'
            });

            if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
            if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);

            const response = await ofetch<{ expenses: Expense[], pagination: any }>(`/api/getExpenses?${urlParams.toString()}`);
            return response.expenses || [];
        }
    );

    // Resource for overall statistics
    const statisticsResource = resource(
        () => [vaultId, dateFilter, params.startDate, params.endDate, refetchKey] as const,
        async ([id, dateF, startDate, endDate]) => {
            const dateRange = getDateRange(dateF as DateFilter,
                startDate ? localDatetimeToUtcIso(startDate) : undefined,
                endDate ? localDatetimeToUtcIso(endDate) : undefined
            );

            const urlParams = new URLSearchParams({vaultId: id});

            if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
            if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);

            const response = await ofetch<{ success: boolean, data: VaultStatistics }>(`/api/getVaultStatistics?${urlParams.toString()}`);
            return response.data;
        }
    );

    // Derive data from resources
    const currentVault = $derived(vaultResource.current);
    const allExpenses = $derived(expensesResource.current || []);
    const statistics = $derived(statisticsResource.current || null);
    const isLoadingVault = $derived(vaultResource.loading);
    const isLoadingExpenses = $derived(expensesResource.loading);
    const isLoadingStats = $derived(statisticsResource.loading);

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
            default:
                return [];
        }
    });

    // All tabs use date-grouped view
    const filteredExpenses = $derived.by(() => {
        // Filter expenses based on filterType and filterName
        const currentFilterType = filterType;
        const currentFilterName = filterName;
        const currentFilterId = filterId;
        let filtered = allExpenses;

        if (currentFilterName) {
            switch (currentFilterType) {
                case 'category':
                    filtered = allExpenses.filter(expense => expense.category?.name === currentFilterName);
                    break;
                case 'template':
                    if (currentFilterId) {
                        filtered = allExpenses.filter(expense =>
                            String(expense.templateId) === String(currentFilterId)
                        );
                    }
                    break;
                case 'member':
                    if (currentFilterId) {
                        filtered = allExpenses.filter(expense => expense.paidBy === currentFilterId);
                    }
                    break;
            }
        }

        return filtered;
    });

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
</script>

<svelte:head>
    <title>Statistics - {currentVault?.vaults.name || 'Vault'} - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-4 px-4 max-w-6xl">
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
            <p class="text-sm text-muted-foreground mt-1">Expense breakdown for {getDateFilterLabel(dateFilter)}</p>
        </div>

        <!-- Date Filter Tabs -->
        <DateFilterTabs
            currentFilter={dateFilter}
            onFilterChange={(filter) => params.dateFilter = filter}
        />

        <!-- Total Card -->
        {#if statistics}
            <Card class="mb-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent class="py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-baseline gap-3">
                            <h2 class="text-xl font-bold">{formatCurrency(filteredTotal.amount)}</h2>
                            <p class="text-sm text-muted-foreground">({filteredTotal.count} transaction{filteredTotal.count !== 1 ? 's' : ''})</p>
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

            <!-- Expense List grouped by date -->
            <div class="space-y-4">
                <ExpenseListByDate
                    expensesByDate={allExpensesByDate}
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                />
            </div>
        {/if}
    {/if}
</div>

<!-- Filter Selection FAB -->
{#if statistics && filterOptions.length > 1}
    <FloatingActionButton
        onclick={() => filterDrawerOpen = true}
    >
        {#snippet icon()}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
            </svg>
        {/snippet}
        Filter
    </FloatingActionButton>

    <!-- Filter Selection Drawer -->
    <FilterChipsDrawer
        bind:open={filterDrawerOpen}
        filterOptions={filterOptions}
        selectedName={filterName}
        allExpensesCount={allExpenses.length}
        filterType={filterType}
        onOpenChange={(open) => filterDrawerOpen = open}
        onSelectAll={() => { params.filterName = ""; filterDrawerOpen = false; }}
        onSelectOption={(name) => { params.filterName = name; filterDrawerOpen = false; }}
    />
{/if}
