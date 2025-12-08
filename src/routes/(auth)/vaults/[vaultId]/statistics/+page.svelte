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
    import {Accordion, AccordionItem, AccordionTrigger, AccordionContent} from "$lib/components/ui/accordion";
    import {FloatingActionButton} from "$lib/components/ui/floating-action-button";
    import type {Expense, VaultStatistics} from "../types";
    import FilterChipsDrawer from "./FilterChipsDrawer.svelte";
    import {cn} from "$lib/utils";
    import {format, parseISO} from "date-fns";

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

    // Drawer state for filter selection
    let filterDrawerOpen = $state(false);

    // Derived filter values - use $state to stabilize
    let filterType = $derived(params.filterType || 'category');
    let dateFilter = $state(params.dateFilter || 'month');
    let selectedId = $derived(params.selectedId);

    // Update dateFilter when params change
    $effect(() => {
        dateFilter = params.dateFilter || 'month';
    });

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
        () => [vaultId, dateFilter, refetchKey] as const,
        async ([id, dateFilterValue]) => {
            const dateF = dateFilterValue || 'month';
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
        () => [vaultId, dateFilter, refetchKey] as const,
        async ([id, dateFilterValue]) => {
            const dateF = dateFilterValue || 'month';
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

    // All tabs use date-grouped view
    const filteredExpenses = $derived.by(() => {
        // Filter expenses based on filterType and selectedId
        const currentFilterType = filterType;
        const currentSelectedId = selectedId;
        let filtered = allExpenses;

        if (currentSelectedId) {
            switch (currentFilterType) {
                case 'category':
                    filtered = allExpenses.filter(expense => expense.category?.name === currentSelectedId);
                    break;
                case 'template':
                    if (currentSelectedId === 'no-template') {
                        filtered = allExpenses.filter(expense =>
                            expense.templateId === null || expense.templateId === undefined
                        );
                    } else {
                        filtered = allExpenses.filter(expense =>
                            String(expense.templateId) === String(currentSelectedId)
                        );
                    }
                    break;
                case 'member':
                    filtered = allExpenses.filter(expense => expense.paidBy === currentSelectedId);
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
        return { amount: total, count };
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
        <div class="mb-4">
            <div class="flex items-center justify-between">
                <div>
<!--                    <h1 class="text-2xl font-bold">{currentVault.vaults.name}</h1>-->
                    <p class="text-sm text-muted-foreground mt-1">Expense breakdown for {getDateFilterLabel()}</p>
                </div>
            </div>
        </div>

        <!-- Date Filter Tabs -->
        <div class="flex gap-2 mb-2 overflow-x-auto pb-2">
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
            <Card class="mb-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent class="py-3">
                    <div class="flex items-center justify-between">
<!--                        <p class="text-sm text-muted-foreground">Total</p>-->
                        <div class="flex items-baseline gap-3">
                            <h2 class="text-xl font-bold">{formatCurrency(filteredTotal.amount)}</h2>
                            <p class="text-sm text-muted-foreground">({filteredTotal.count} transaction{filteredTotal.count !== 1 ? 's' : ''})</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Filter Type Tabs -->
            <div class="flex gap-2 mb-2 border-b">
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
                        Category
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
                        Template
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
                        Member
                    </div>
                </button>
            </div>


            <!-- Expense List grouped by date -->
            <div class="space-y-4">
                {#each allExpensesByDate as dateGroup (dateGroup.dateKey)}
                    <div>
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
                                                    onclick={() => handleEditExpense(expense.id)}
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
                                                    onclick={() => handleDeleteExpense(expense.id)}
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
                    </div>
                {/each}
            </div>

            {#if allExpensesByDate.length === 0}
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
        selectedId={selectedId}
        allExpensesCount={allExpenses.length}
        filterType={filterType}
        onOpenChange={(open) => filterDrawerOpen = open}
        onSelectAll={() => { params.selectedId = ""; filterDrawerOpen = false; }}
        onSelectOption={(id) => { params.selectedId = id; filterDrawerOpen = false; }}
    />
{/if}
