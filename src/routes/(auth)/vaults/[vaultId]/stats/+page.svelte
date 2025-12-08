<script lang="ts">
    import {goto} from "$app/navigation";
    import {useSearchParams} from "runed/kit";
    import {ofetch} from "ofetch";
    import {resource} from "runed";
    import * as v from 'valibot';
    import type {VaultWithMember} from "$lib/schemas/read/vaultWithMember";
    import {Button} from "$lib/components/ui/button";
    import {Card, CardContent, CardHeader, CardTitle} from "$lib/components/ui/card";
    import {LoadingOverlay} from "$lib/components/ui/loading-overlay";
    import {Accordion, AccordionItem, AccordionTrigger, AccordionContent} from "$lib/components/ui/accordion";
    import type {Expense, VaultStatistics} from "../types";
    import {cn, localDatetimeToUtcIso} from "$lib/utils";
    import {format, parseISO} from "date-fns";
    import { page } from '$app/state';

    let {data} = $props();
    let {vaultId} = data;

    // Schema for stats page query params
    const statsParamsSchema = v.object({
        filterType: v.optional(v.picklist(['template', 'category', 'member']), 'category'),
        dateFilter: v.optional(v.picklist(['all', 'today', 'week', 'month', 'year']), 'month'),
        startDate: v.optional(v.fallback(v.string(), ""), ""),
        endDate: v.optional(v.fallback(v.string(), ""), ""),
        selectedId: v.optional(v.fallback(v.string(), ""), "")
    });

    const params = useSearchParams(statsParamsSchema);

    // Refetch keys
    let refetchKey = $state(0);
    let vaultRefetchKey = $state(0);

    // Derived filter values
    let filterType = $derived(params.filterType || 'category');
    let dateFilter = $derived(params.dateFilter || 'month');
    let selectedId = $derived(params.selectedId);

    function getDateRange(): { startDate?: string; endDate?: string } {
        const now = new Date();

        switch (dateFilter) {
            case 'all':
                return {};

            case 'today': {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                return {
                    startDate: start.toISOString(),
                    endDate: end.toISOString()
                };
            }

            case 'week': {
                const dayOfWeek = now.getDay();
                const start = new Date(now);
                start.setDate(now.getDate() - dayOfWeek);
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                return {
                    startDate: start.toISOString(),
                    endDate: end.toISOString()
                };
            }

            case 'month': {
                const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                return {
                    startDate: start.toISOString(),
                    endDate: end.toISOString()
                };
            }

            case 'year': {
                const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
                const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                return {
                    startDate: start.toISOString(),
                    endDate: end.toISOString()
                };
            }

            default:
                return {};
        }
    }

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
        () => [vaultId, params.dateFilter, params.startDate, params.endDate, refetchKey] as const,
        async ([id, dateFilter, startDate, endDate]) => {
            const dateF = dateFilter || 'month';
            const now = new Date();
            let dateRange: { startDate?: string; endDate?: string } = {};

            switch (dateF) {
                case 'today': {
                    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                    dateRange = { startDate: start.toISOString(), endDate: end.toISOString() };
                    break;
                }
                case 'week': {
                    const dayOfWeek = now.getDay();
                    const start = new Date(now);
                    start.setDate(now.getDate() - dayOfWeek);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    end.setHours(23, 59, 59, 999);
                    dateRange = { startDate: start.toISOString(), endDate: end.toISOString() };
                    break;
                }
                case 'month': {
                    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    dateRange = { startDate: start.toISOString(), endDate: end.toISOString() };
                    break;
                }
                case 'year': {
                    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
                    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                    dateRange = { startDate: start.toISOString(), endDate: end.toISOString() };
                    break;
                }
            }

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
        () => [vaultId, params.dateFilter, params.startDate, params.endDate, refetchKey] as const,
        async ([id, dateFilter, startDate, endDate]) => {
            const dateF = dateFilter || 'month';
            const now = new Date();
            let dateRange: { startDate?: string; endDate?: string } = {};

            switch (dateF) {
                case 'today': {
                    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                    dateRange = { startDate: start.toISOString(), endDate: end.toISOString() };
                    break;
                }
                case 'week': {
                    const dayOfWeek = now.getDay();
                    const start = new Date(now);
                    start.setDate(now.getDate() - dayOfWeek);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(start);
                    end.setDate(start.getDate() + 6);
                    end.setHours(23, 59, 59, 999);
                    dateRange = { startDate: start.toISOString(), endDate: end.toISOString() };
                    break;
                }
                case 'month': {
                    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    dateRange = { startDate: start.toISOString(), endDate: end.toISOString() };
                    break;
                }
                case 'year': {
                    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
                    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                    dateRange = { startDate: start.toISOString(), endDate: end.toISOString() };
                    break;
                }
            }

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

    // Group expenses by filter type and include filtered expenses
    const groupedData = $derived.by(() => {
        if (!statistics) return [];

        // Force tracking of these dependencies
        const currentFilterType = filterType;
        const currentSelectedId = selectedId;

        let result: any[] = [];

        switch (filterType) {
            case 'template':
                result = statistics.byTemplate.map(item => {
                    const filteredExpenses = allExpenses.filter(expense => {
                        // Handle null/undefined for "No Template"
                        if (item.templateId === null || item.templateId === undefined) {
                            return expense.templateId === null || expense.templateId === undefined;
                        }
                        return expense.templateId === item.templateId;
                    });
                    return {
                        id: item.templateId || 'no-template',
                        name: item.name || item.templateName,
                        icon: item.templateIcon || '📝',
                        amount: item.amount,
                        count: item.count,
                        percentage: statistics.total.amount > 0 ? (item.amount / statistics.total.amount) * 100 : 0,
                        expenses: filteredExpenses
                    };
                });
                break;
            case 'category':
                result = statistics.byCategory.map(item => {
                    const filteredExpenses = allExpenses.filter(expense => expense.category?.name === item.categoryName);
                    return {
                        id: item.categoryName,
                        name: item.categoryName,
                        icon: '🏷️',
                        amount: item.amount,
                        count: item.count,
                        percentage: statistics.total.amount > 0 ? (item.amount / statistics.total.amount) * 100 : 0,
                        expenses: filteredExpenses
                    };
                });
                break;
            case 'member':
                result = statistics.byMember.map(item => {
                    const filteredExpenses = allExpenses.filter(expense => expense.paidBy === item.userId);
                    return {
                        id: item.userId,
                        name: item.displayName,
                        icon: '👤',
                        amount: item.amount,
                        count: item.count,
                        percentage: statistics.total.amount > 0 ? (item.amount / statistics.total.amount) * 100 : 0,
                        expenses: filteredExpenses
                    };
                });
                break;
        }

        // Filter out groups with no expenses
        result = result.filter(item => item.expenses.length > 0);

        // If a specific item is selected, show only that one
        if (currentSelectedId) {
            result = result.filter(item => String(item.id) === String(currentSelectedId));
        }

        return result;
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

    // Helper function to group expenses by date
    function groupExpensesByDate(expenses: Expense[]) {
        const grouped = new Map<string, Expense[]>();

        for (const expense of expenses) {
            const date = parseISO(expense.date);
            const dateKey = format(date, 'yyyy-MM-dd');

            if (!grouped.has(dateKey)) {
                grouped.set(dateKey, []);
            }
            grouped.get(dateKey)!.push(expense);
        }

        return Array.from(grouped.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([dateKey, expenseList]) => ({
                dateKey,
                dateLabel: format(parseISO(dateKey), 'EEE, MMM d, yyyy'),
                expenses: expenseList
            }));
    }

    // For category tab without selectedId, show all expenses grouped by date
    const shouldShowDateGroupedView = $derived(filterType === 'category' && !selectedId);
    const allExpensesByDate = $derived.by(() => {
        if (!shouldShowDateGroupedView) return [];
        return groupExpensesByDate(allExpenses);
    });

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function handleDeleteExpense(expenseId: string) {
        // Implement delete logic
    }

    function handleEditExpense(expenseId: string) {
        goto(`/vaults/${vaultId}/expenses/${expenseId}/edit`);
    }

    function handleBack() {
        goto(`/vaults/${vaultId}`);
    }

    function formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    function getDateFilterLabel(): string {
        switch (dateFilter) {
            case 'today': return 'Today';
            case 'week': return 'This Week';
            case 'month': return 'This Month';
            case 'year': return 'This Year';
            case 'all': return 'All Time';
            default: return 'This Month';
        }
    }
</script>

<svelte:head>
    <title>Stats - {currentVault?.vaults.name || 'Vault'} - DuitGee</title>
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
        <div class="mb-6">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold">{currentVault.vaults.name}</h1>
                    <p class="text-sm text-muted-foreground mt-1">Expense breakdown for {getDateFilterLabel()}</p>
                </div>
                <Button variant="outline" onclick={handleBack}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                    </svg>
                    Back
                </Button>
            </div>
        </div>

        <!-- Date Filter Tabs -->
        <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
                type="button"
                onclick={() => params.dateFilter = 'today'}
                class={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    dateFilter === 'today'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                )}
            >
                Today
            </button>
            <button
                type="button"
                onclick={() => params.dateFilter = 'week'}
                class={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    dateFilter === 'week'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                )}
            >
                This Week
            </button>
            <button
                type="button"
                onclick={() => params.dateFilter = 'month'}
                class={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    dateFilter === 'month'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                )}
            >
                This Month
            </button>
            <button
                type="button"
                onclick={() => params.dateFilter = 'year'}
                class={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    dateFilter === 'year'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                )}
            >
                This Year
            </button>
            <button
                type="button"
                onclick={() => params.dateFilter = 'all'}
                class={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    dateFilter === 'all'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                )}
            >
                All Time
            </button>
        </div>

        <!-- Total Card -->
        {#if statistics}
            <Card class="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent class="pt-6">
                    <div class="text-center">
                        <p class="text-sm text-muted-foreground mb-2">Total Expenses</p>
                        <h2 class="text-4xl font-bold mb-1">{formatCurrency(statistics.total.amount)}</h2>
                        <p class="text-sm text-muted-foreground">{statistics.total.count} transaction{statistics.total.count !== 1 ? 's' : ''}</p>
                    </div>
                </CardContent>
            </Card>

            <!-- Filter Type Tabs -->
            <div class="flex gap-2 mb-4 border-b">
                <button
                    type="button"
                    onclick={() => { params.filterType = 'category'; params.selectedId = undefined; }}
                    class={cn(
                        "px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                        filterType === 'category'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                        </svg>
                        By Category
                    </div>
                </button>
                <button
                    type="button"
                    onclick={() => { params.filterType = 'template'; params.selectedId = undefined; }}
                    class={cn(
                        "px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                        filterType === 'template'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                        By Template
                    </div>
                </button>
                <button
                    type="button"
                    onclick={() => { params.filterType = 'member'; params.selectedId = undefined; }}
                    class={cn(
                        "px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                        filterType === 'member'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <div class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                        </svg>
                        By Member
                    </div>
                </button>
            </div>

            <!-- Filter Chips -->
            {#if filterOptions.length > 1}
                <div class="mb-6">
                    <div class="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onclick={() => params.selectedId = ""}
                            class={cn(
                                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                !selectedId
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted hover:bg-muted/80"
                            )}
                        >
                            All
                            <span class="text-xs opacity-75">({statistics?.total.count || 0})</span>
                        </button>
                        {#each filterOptions as option (option.id)}
                            <button
                                type="button"
                                onclick={() => {
                                    if(option.id){
                                        params.selectedId = option.id;
                                    }
                                }}
                                class={cn(
                                    "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                                    selectedId === option.id
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted hover:bg-muted/80"
                                )}
                            >
                                <span>{option.icon}</span>
                                <span>{option.name}</span>
                                <span class="text-xs opacity-75">({option.count})</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Breakdown Cards -->
            {#if shouldShowDateGroupedView}
                <!-- Date-grouped view for category tab -->
                <div class="space-y-6">
                    {#each allExpensesByDate as dateGroup (dateGroup.dateKey)}
                        <div>
                            <!-- Date Header -->
                            <div class="flex justify-center mb-4">
                                <div class="inline-block px-4 py-2 rounded-lg bg-primary/10 text-primary">
                                    <span class="text-sm font-medium">{dateGroup.dateLabel}</span>
                                </div>
                            </div>

                            <!-- Expenses for this date -->
                            <div class="space-y-2">
                                {#each dateGroup.expenses as expense (expense.id)}
                                    <Card class="hover:shadow-md transition-shadow">
                                        <CardContent class="p-4">
                                            <div class="flex items-center justify-between">
                                                <div class="flex-1 min-w-0">
                                                    <p class="text-base font-medium truncate">
                                                        {expense.note || 'No description'}
                                                    </p>
                                                    <div class="flex items-center gap-2 mt-1">
                                                        {#if expense.category?.name}
                                                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                                                                {expense.category.name}
                                                            </span>
                                                        {/if}
                                                        <span class="text-xs text-muted-foreground">
                                                            {formatDate(expense.date)}
                                                        </span>
                                                        {#if expense.paidByName}
                                                            <span class="text-xs text-muted-foreground">
                                                                by {expense.paidByName}
                                                            </span>
                                                        {/if}
                                                    </div>
                                                </div>
                                                <div class="text-right ml-4">
                                                    <p class="text-lg font-bold whitespace-nowrap">
                                                        {formatCurrency(expense.amount)}
                                                    </p>
                                                    <div class="flex gap-2 mt-1 justify-end">
                                                        <button
                                                            type="button"
                                                            onclick={() => handleEditExpense(expense.id)}
                                                            class="text-xs text-primary hover:underline"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onclick={() => handleDeleteExpense(expense.id)}
                                                            class="text-xs text-destructive hover:underline"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            {:else}
                <!-- Card-based view for template/member tabs or when specific item is selected -->
                <div class="grid grid-cols-1 gap-4">
                    {#each groupedData as item (item.id)}
                        {@const expensesByDate = groupExpensesByDate(item.expenses)}
                        <Card class="hover:shadow-lg transition-shadow">
                            <CardContent class="pt-6">
                                <!-- Summary -->
                                <div class="flex items-start justify-between mb-4">
                                    <div class="flex items-center gap-3">
                                        <div class="text-3xl">{item.icon}</div>
                                        <div>
                                            <h3 class="font-semibold text-lg">{item.name}</h3>
                                            <p class="text-sm text-muted-foreground">{item.count} transaction{item.count !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-2xl font-bold">{formatCurrency(item.amount)}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 mb-4">
                                    <div class="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                        <div
                                            class="bg-primary h-full transition-all duration-300"
                                            style="width: {item.percentage}%"
                                        ></div>
                                    </div>
                                    <span class="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                        {item.percentage.toFixed(1)}%
                                    </span>
                                </div>

                                <!-- Expense List Accordion -->
                                {#if expensesByDate.length > 0}
                                    <div class="border-t pt-4">
                                        <Accordion type="multiple">
                                            {#each expensesByDate as dateGroup (dateGroup.dateKey)}
                                                <AccordionItem value={dateGroup.dateKey} class="border rounded-lg mb-2 px-3">
                                                    <AccordionTrigger class="hover:no-underline py-2">
                                                        <div class="flex items-center justify-between w-full pr-2">
                                                            <span class="text-sm font-medium">{dateGroup.dateLabel}</span>
                                                            <span class="text-sm text-muted-foreground">
                                                                {dateGroup.expenses.length} item{dateGroup.expenses.length !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <div class="space-y-2 pb-2">
                                                            {#each dateGroup.expenses as expense (expense.id)}
                                                                <div class="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                                                                    <div class="flex-1 min-w-0">
                                                                        <p class="text-sm font-medium truncate">
                                                                            {expense.note || '-'}
                                                                        </p>
                                                                        <div class="flex items-center gap-2 mt-1">
                                                                            <span class="text-xs text-muted-foreground">
                                                                                {formatDate(expense.date)}
                                                                            </span>
                                                                            {#if expense.category?.name}
                                                                                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">
                                                                                    {expense.category.name}
                                                                                </span>
                                                                            {/if}
                                                                            {#if expense.paidByName}
                                                                                <span class="text-xs text-muted-foreground">
                                                                                    by {expense.paidByName}
                                                                                </span>
                                                                            {/if}
                                                                        </div>
                                                                    </div>
                                                                    <div class="text-right ml-4">
                                                                        <p class="text-sm font-bold whitespace-nowrap">
                                                                            {formatCurrency(expense.amount)}
                                                                        </p>
                                                                        <div class="flex gap-1 mt-1">
                                                                            <button
                                                                                type="button"
                                                                                onclick={() => handleEditExpense(expense.id)}
                                                                                class="text-xs text-primary hover:underline"
                                                                            >
                                                                                Edit
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            {/each}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            {/each}
                                        </Accordion>
                                    </div>
                                {/if}
                            </CardContent>
                        </Card>
                    {/each}
                </div>
            {/if}

            {#if (shouldShowDateGroupedView && allExpensesByDate.length === 0) || (!shouldShowDateGroupedView && groupedData.length === 0)}
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">📊</div>
                    <h3 class="text-lg font-semibold mb-2">No data available</h3>
                    <p class="text-muted-foreground">
                        No expenses found for this time period.
                    </p>
                </div>
            {/if}
        {/if}
    {/if}
</div>
