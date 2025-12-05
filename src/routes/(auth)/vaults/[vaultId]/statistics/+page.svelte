<script lang="ts">
    import {goto} from "$app/navigation";
    import {useSearchParams} from "runed/kit";
    import {ofetch} from "ofetch";
    import {resource} from "runed";
    import * as v from 'valibot';
    import type {VaultWithMember} from "$lib/schemas/read/vaultWithMember";
    import {Button} from "$lib/components/ui/button";
    import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "$lib/components/ui/card";
    import {LoadingOverlay} from "$lib/components/ui/loading-overlay";
    import {Accordion, AccordionItem, AccordionTrigger, AccordionContent} from "$lib/components/ui/accordion";
    import type {Expense, VaultStatistics} from "../types";
    import ExpenseFilters from "../ExpenseFilters.svelte";
    import {filterSchema} from "../schemas";
    import {cn} from "$lib/utils";

    let {data} = $props();
    let {vaultId} = data;

    // Schema for statistics page query params
    const statisticsParamsSchema = v.object({
        filterType: v.optional(v.picklist(['template', 'category', 'member']), 'template'),
        filterId: v.optional(v.string()),
        filterName: v.optional(v.string()),
        dateFilter: v.optional(v.picklist(['all', 'today', 'week', 'month', 'year', 'custom']), 'all'),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string())
    });

    const params = useSearchParams(statisticsParamsSchema);

    // Refetch keys to trigger data reload
    let refetchKey = $state(0);
    let vaultRefetchKey = $state(0);

    // Derived filter values
    let filterType = $derived(params.filterType || 'template');
    let filterId = $derived(params.filterId);
    let dateFilter = $derived(params.dateFilter || 'all');

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

            case 'custom': {
                if (!params.startDate || !params.endDate) return {};
                return {
                    startDate: new Date(params.startDate).toISOString(),
                    endDate: new Date(params.endDate).toISOString()
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

    // Resource for filtered expenses
    const expensesResource = resource(
        () => [vaultId, filterType, filterId, dateFilter, params.startDate, params.endDate, refetchKey] as const,
        async ([id, type, fId, dateF, startDate, endDate]) => {
            const dateRange = getDateRange();
            const urlParams = new URLSearchParams({
                vaultId: id,
                page: '1',
                limit: '100'
            });

            // Add date filters
            if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
            if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);

            // Add specific filter based on type
            if (type === 'template' && fId) {
                urlParams.append('templateId', fId);
            } else if (type === 'category') {
                urlParams.append('categoryName', filterName);
            } else if (type === 'member' && fId) {
                urlParams.append('paidBy', fId);
            }

            const response = await ofetch<{ expenses: Expense[], pagination: any }>(`/api/getExpenses?${urlParams.toString()}`);
            return response.expenses || [];
        }
    );

    // Resource for overall statistics (for context)
    const statisticsResource = resource(
        () => [vaultId, dateFilter, params.startDate, params.endDate, refetchKey] as const,
        async ([id, dateF, startDate, endDate]) => {
            const dateRange = getDateRange();
            const urlParams = new URLSearchParams({vaultId: id});

            if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
            if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);

            const response = await ofetch<{ success: boolean, data: VaultStatistics }>(`/api/getVaultStatistics?${urlParams.toString()}`);
            return response.data;
        }
    );

    // Derive data from resources
    const currentVault = $derived(vaultResource.current);
    const expenses = $derived(expensesResource.current || []);
    const statistics = $derived(statisticsResource.current || null);
    const isLoadingVault = $derived(vaultResource.loading);
    const isLoadingExpenses = $derived(expensesResource.loading);
    const isLoadingStats = $derived(statisticsResource.loading);

    // Derive filter name from URL or from actual expense data (must be after expenses is defined)
    const filterName = $derived.by(() => {
        // Try URL parameter first (decode it in case it has special characters)
        if (params.filterName) {
            try {
                return decodeURIComponent(params.filterName);
            } catch {
                return params.filterName;
            }
        }

        // Try to derive from expenses data
        const firstExpense = expenses[0];
        if (!firstExpense) return 'All Expenses';

        switch (filterType) {
            case 'category':
                return firstExpense.category.name;
            case 'member':
                return firstExpense.paidByName || 'Vault Expenses';
            case 'template':
            default:
                return 'Template Expenses';
        }
    });

    // Calculate filtered statistics
    const filteredTotal = $derived.by(() => {
        if (!expenses.length) return { amount: 0, count: 0 };
        return {
            amount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
            count: expenses.length
        };
    });

    function handleBack() {
        goto(`/vaults/${vaultId}`);
    }

    function formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getFilterTypeLabel(): string {
        switch (filterType) {
            case 'template': return 'Template';
            case 'category': return 'Category';
            case 'member': return 'Member';
            default: return 'Filter';
        }
    }

    async function handleDeleteExpense(expenseId: string) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            await ofetch('/api/deleteExpense', {
                method: 'POST',
                body: JSON.stringify({id: expenseId, vaultId}),
                headers: {'Content-Type': 'application/json'}
            });

            // Trigger refetch of expenses
            refetchKey++;
        } catch (error) {
            console.error('Failed to delete expense:', error);
            alert('Failed to delete expense. Please try again.');
        }
    }

    function handleEditExpense(expenseId: string) {
        goto(`/vaults/${vaultId}/expenses/${expenseId}/edit`);
    }

    function handleFilterChange(type: 'template' | 'category' | 'member', id: string | null, name: string) {
        // Navigate to same page with different filter
        const searchParams = new URLSearchParams();
        searchParams.set('filterType', type);
        if (id) searchParams.set('filterId', id);
        searchParams.set('filterName', name);

        // Preserve current date filter
        if (dateFilter && dateFilter !== 'all') {
            searchParams.set('dateFilter', dateFilter);
            if (dateFilter === 'custom' && params.startDate && params.endDate) {
                searchParams.set('startDate', params.startDate);
                searchParams.set('endDate', params.endDate);
            }
        }

        goto(`/vaults/${vaultId}/statistics?${searchParams.toString()}`);
    }
</script>

<svelte:head>
    <title>Statistics - {filterName} - {currentVault?.vaults.name || 'Vault'} - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-8 px-4 max-w-7xl relative">
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
            <Button variant="ghost" onclick={handleBack} class="mb-4 -ml-2">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fill-rule="evenodd"
                        d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                        clip-rule="evenodd"
                    />
                </svg>
                Back to Vault
            </Button>

            <div>
                <h1 class="text-3xl font-bold">Statistics</h1>
                <p class="text-muted-foreground mt-1">
                    {getFilterTypeLabel()}: <span class="font-semibold text-foreground">{filterName}</span>
                </p>
            </div>
        </div>

        <!-- Date Filters -->
        <ExpenseFilters
            filterType={dateFilter}
            startDate={params.startDate || ''}
            endDate={params.endDate || ''}
            onFilterChange={(filter) => { params.dateFilter = filter; }}
            onApplyCustomFilter={() => {}}
            onStartDateChange={(value) => params.startDate = value || undefined}
            onEndDateChange={(value) => params.endDate = value || undefined}
        />

        <!-- Filter Selection -->
        {#if statistics}
            <Accordion type="multiple" class="mb-6">
                <AccordionItem value="filter-selection" class="border rounded-lg px-4">
                    <AccordionTrigger class="hover:no-underline py-3">
                        <div class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
                            </svg>
                            <div class="text-left">
                                <h3 class="text-sm font-semibold">Switch Filter</h3>
                                <p class="text-xs text-muted-foreground">View statistics by template, category, or member</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div class="space-y-4 pb-4">
                            <!-- Templates -->
                            {#if statistics.byTemplate.length > 0}
                                <div>
                                    <h4 class="text-sm font-semibold mb-2 text-muted-foreground">By Template</h4>
                                    <div class="flex flex-wrap gap-2">
                                        {#each statistics.byTemplate as template}
                                            <button
                                                type="button"
                                                onclick={() => handleFilterChange('template', template.templateId, template.templateName)}
                                                class={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                                    filterType === 'template' && filterId === template.templateId
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted hover:bg-muted/80"
                                                )}
                                            >
                                                <span>{template.templateIcon}</span>
                                                <span>{template.templateName}</span>
                                                <span class="text-xs opacity-75">({template.count})</span>
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Categories -->
                            {#if statistics.byCategory.length > 0}
                                <div>
                                    <h4 class="text-sm font-semibold mb-2 text-muted-foreground">By Category</h4>
                                    <div class="flex flex-wrap gap-2">
                                        {#each statistics.byCategory as category}
                                            <button
                                                type="button"
                                                onclick={() => handleFilterChange('category', null, category.categoryName)}
                                                class={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                                    filterType === 'category' && filterName === category.categoryName
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted hover:bg-muted/80"
                                                )}
                                            >
                                                <span>{category.categoryName}</span>
                                                <span class="text-xs opacity-75">({category.count})</span>
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <!-- Members -->
                            {#if statistics.byMember.length > 0}
                                <div>
                                    <h4 class="text-sm font-semibold mb-2 text-muted-foreground">By Member</h4>
                                    <div class="flex flex-wrap gap-2">
                                        {#each statistics.byMember as member}
                                            <button
                                                type="button"
                                                onclick={() => handleFilterChange('member', member.userId, member.displayName)}
                                                class={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                                    filterType === 'member' && filterId === member.userId
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted hover:bg-muted/80"
                                                )}
                                            >
                                                <span>{member.displayName}</span>
                                                <span class="text-xs opacity-75">({member.count})</span>
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        {/if}

        <!-- Statistics Summary -->
        <Accordion type="multiple" class="mb-6">
            <AccordionItem value="summary" class="border rounded-lg px-4">
                <AccordionTrigger class="hover:no-underline py-3">
                    <div class="flex items-center justify-between w-full pr-2">
                        <div class="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                            </svg>
                            <div class="text-left">
                                <h3 class="text-sm font-semibold">Summary</h3>
                                <p class="text-xs text-muted-foreground">Filtered expenses for {filterName}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-bold">{formatCurrency(filteredTotal.amount)}</p>
                            <p class="text-xs text-muted-foreground">{filteredTotal.count} expense{filteredTotal.count !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div class="pb-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p class="text-sm text-muted-foreground mb-1">Total Amount</p>
                                <p class="text-3xl font-bold">{formatCurrency(filteredTotal.amount)}</p>
                            </div>
                            <div>
                                <p class="text-sm text-muted-foreground mb-1">Total Expenses</p>
                                <p class="text-3xl font-bold">{filteredTotal.count}</p>
                            </div>
                        </div>

                        {#if statistics}
                            <div class="mt-6 pt-6 border-t">
                                <p class="text-sm text-muted-foreground mb-3">Percentage of Total</p>
                                <div class="space-y-2">
                                    <div class="flex justify-between text-sm">
                                        <span>Amount:</span>
                                        <span class="font-semibold">
                                            {statistics.total.amount > 0 ? ((filteredTotal.amount / statistics.total.amount) * 100).toFixed(1) : 0}%
                                        </span>
                                    </div>
                                    <div class="flex justify-between text-sm">
                                        <span>Count:</span>
                                        <span class="font-semibold">
                                            {statistics.total.count > 0 ? ((filteredTotal.count / statistics.total.count) * 100).toFixed(1) : 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>

        <!-- Expenses List -->
        <Card>
            <CardHeader>
                <CardTitle>Expenses</CardTitle>
                <CardDescription>
                    {filteredTotal.count} expense{filteredTotal.count !== 1 ? 's' : ''} found
                </CardDescription>
            </CardHeader>
            <CardContent>
                {#if expenses.length === 0}
                    <div class="text-center py-12">
                        <div class="text-6xl mb-4">📊</div>
                        <h3 class="text-lg font-semibold mb-2">No expenses found</h3>
                        <p class="text-muted-foreground">
                            There are no expenses matching your current filters.
                        </p>
                    </div>
                {:else}
                    <!-- Mobile Accordion Layout -->
                    <Accordion type="multiple" class="sm:hidden">
                        {#each expenses as expense (expense.id)}
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
                                                <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                                                    {expense.category.name}
                                                </span>
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

                    <!-- Desktop Accordion Layout -->
                    <Accordion type="multiple" class="hidden sm:block">
                        {#each expenses as expense (expense.id)}
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
                                                <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                                                    {expense.category.name}
                                                </span>
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
                                                onclick={() => handleEditExpense(expense.id)}
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
                {/if}
            </CardContent>
        </Card>
    {/if}
</div>
