<script lang="ts">
    import {goto} from "$app/navigation";
    import {useSearchParams} from "runed/kit";
    import {ofetch} from "ofetch";
    import {resource} from "runed";
    import type {VaultWithMember} from "$lib/schemas/read/vaultWithMember";
    import {Button} from "$lib/components/ui/button";
    import {Card, CardContent} from "$lib/components/ui/card";
    import {filterSchema} from "./schemas";
    import type {VaultStatistics} from "./types";
    import VaultHeader from "./VaultHeader.svelte";
    import ExpenseFilters from "./ExpenseFilters.svelte";
    import InviteForm from "./InviteForm.svelte";
    import {LoadingOverlay} from "$lib/components/ui/loading-overlay";
    import {Toaster} from "$lib/components/ui/sonner";
    import {toast} from "svelte-sonner";
    import {localDatetimeToUtcIso, getDateRange, type DateFilter} from "$lib/utils";
    import {createVaultFormatters} from "$lib/vaultFormatting";
    import {page} from "$app/state";
    import { RecentExpenses } from "$lib/components/ui/recent-expenses";
    import ArrowRight from "@lucide/svelte/icons/arrow-right";
    import type { Expense } from "./types";

    let {vaultId} = page.params

    const params = useSearchParams(filterSchema);

    // Funds resource
    type FundRow = {
        fund: { id: string; name: string; color: string | null; icon: string | null; balance: number; status: string };
        activeCycle: { openingBalance: number; topUpAmount: number; totalSpent: number; totalReimbursed: number; totalDeducted: number } | null;
    };
    let fundsRefetchKey = $state(0);
    const fundsResource = resource(
        () => [vaultId, fundsRefetchKey] as const,
        async ([id]) => {
            const response = await ofetch<{ success: boolean; data: FundRow[] }>(`/api/getFunds?vaultId=${id}`);
            return (response.data ?? []).filter((r) => r.fund.status === 'active');
        }
    );
    const fundRows = $derived(fundsResource.current ?? []);

    // Refetch keys to trigger data reload (e.g., after delete/update)
    let refetchKey = $state(0);
    let vaultRefetchKey = $state(0);

    // Fund filter state — persisted in URL
    const selectedFundId = $derived(params.fundId || null);

    // UI state
    let showInviteForm = $state(false);
    let inviteEmail = $state('');
    let inviteRole = $state<'admin' | 'member'>('member');
    let isInviting = $state(false);

    // Filter state - derived from URL query params
    let filterType = $derived(params.filter as DateFilter);

    function getDateRangeWithCustom(): { startDate?: string; endDate?: string } {
        if (filterType === 'custom' && params.startDate && params.endDate) {
            return {
                startDate: localDatetimeToUtcIso(params.startDate),
                endDate: localDatetimeToUtcIso(params.endDate)
            };
        }
        return getDateRange(filterType);
    }

    // Resource for vault data
    const vaultResource = resource(
        () => [vaultId, vaultRefetchKey] as const,
        async ([id]) => {
            const response = await ofetch<{ success: boolean, data: VaultWithMember }>(`/api/getVault?vaultId=${id}`);
            return response.data;
        },
        {
            debounce: 300,
        }
    );

    // Resource for statistics - auto-refetches when filter changes
    const statisticsResource = resource(
        () => {
            // Only include startDate/endDate in dependencies for custom filters
            if (filterType === 'custom') {
                return [vaultId, filterType, params.startDate, params.endDate, refetchKey, selectedFundId] as const;
            }
            return [vaultId, filterType, refetchKey, selectedFundId] as const;
        },
        async (deps) => {
            const dateRange = getDateRangeWithCustom();
            const urlParams = new URLSearchParams({
                vaultId: deps[0],
                    ...dateRange
            });

            if (selectedFundId) urlParams.append('fundId', selectedFundId);

            const response = await ofetch<{ success: boolean, data: VaultStatistics }>(`/api/getVaultStatistics?${urlParams.toString()}`);
            return response.data;
        },
        {
            debounce: 300,
        }
    );

    // Resource for expenses - auto-refetches when filter changes
    const expensesResource = resource(
        () => {
            // Include startDate/endDate in dependencies for custom filters
            if (filterType === 'custom') {
                return [vaultId, filterType, params.startDate, params.endDate, refetchKey, selectedFundId] as const;
            }
            return [vaultId, filterType, refetchKey, selectedFundId] as const;
        },
        async (deps) => {
            const dateRange = getDateRangeWithCustom();
            const urlParams = new URLSearchParams({
                vaultId: deps[0],
                page: '1',
                limit: '100'
            });

            if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
            if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);
            if (selectedFundId) urlParams.append('fundId', selectedFundId);

            const response = await ofetch<{ expenses: Expense[]; pagination: any }>(
                `/api/getExpenses?${urlParams.toString()}`
            );
            return response.expenses || [];
        },
        {
            debounce: 300,
        }
    );

    // Derive data from resources
    const currentVault = $derived(vaultResource.current);
    const statistics = $derived(statisticsResource.current || null);
    const expenses = $derived(expensesResource.current || []);
    const isLoadingVault = $derived(vaultResource.loading);
    const isLoadingStats = $derived(statisticsResource.loading);
    const isLoadingExpenses = $derived(expensesResource.loading);
    const vaultError = $derived(vaultResource.error);
    const statisticsError = $derived(statisticsResource.error);

    // Create vault-specific formatters
    const vaultFormatters = $derived(
        currentVault
            ? createVaultFormatters({
                locale: currentVault.vaults.locale || 'en-US',
                currency: currentVault.vaults.currency || 'USD'
            })
            : createVaultFormatters({ locale: 'en-US', currency: 'USD' })
    );

    $effect(() => {
        if (statisticsError) {
            toast.error('Failed to load statistics. Please try again.');
        }
    });

    function handleRetryExpenses() {
        refetchKey++;
    }

    function handleCreateExpense() {
        const returnTo = page.url.pathname + page.url.search;
        const qs = new URLSearchParams({ returnTo });
        goto(`/vaults/${vaultId}/expenses/new?${qs.toString()}`);
    }

    function handleEditVault() {
        goto(`/vaults/${vaultId}/edit`);
    }

    function handleEditExpense(expenseId: string) {
        goto(`/vaults/${vaultId}/expenses/${expenseId}/edit`);
    }

    async function handleDeleteExpense(expenseId: string) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            await ofetch('/api/deleteExpense', {
                method: 'POST',
                body: JSON.stringify({id: expenseId, vaultId}),
                headers: {'Content-Type': 'application/json'}
            });

            // Trigger refetch of expenses and statistics
            refetchKey++;
        } catch (error) {
            console.error('Failed to delete expense:', error);
            alert('Failed to delete expense. Please try again.');
        }
    }

    function handleBack() {
        goto('/vaults');
    }

    function toggleFundFilter(fundId: string) {
        if (params.fundId === fundId) {
            params.fundId = '';
        } else {
            params.fundId = fundId;
        }
    }

    function toggleInviteForm() {
        showInviteForm = !showInviteForm;
        if (!showInviteForm) {
            // Reset form when closing
            inviteEmail = '';
            inviteRole = 'member';
        }
    }

    async function handleInviteUser() {
        if (!inviteEmail.trim()) {
            alert('Please enter an email address');
            return;
        }

        isInviting = true;

        try {
            const response = await ofetch('/api/createInvitation', {
                method: 'POST',
                body: {
                    vaultId,
                    inviteeEmail: inviteEmail.trim(),
                    role: inviteRole
                },
                headers: {'Content-Type': 'application/json'}
            });

            if (response.success) {
                alert(`Invitation sent to ${inviteEmail}`);
                // Reset form
                inviteEmail = '';
                inviteRole = 'member';
                showInviteForm = false;
            } else {
                throw new Error(response.error || 'Failed to send invitation');
            }
        } catch (error: any) {
            console.error('Failed to invite user:', error);
            const errorMessage = error?.data?.error || error?.message || 'Failed to send invitation. Please try again.';
            alert(errorMessage);
        } finally {
            isInviting = false;
        }
    }

    async function handleSetDefaultVault() {
        try {
            await ofetch('/api/setDefaultVault', {
                method: 'POST',
                body: JSON.stringify({vaultId}),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Trigger refetch of vault data to update isDefault status
            vaultRefetchKey++;
        } catch (error) {
            console.error('Failed to set default vault:', error);
            alert('Failed to set default vault. Please try again.');
        }
    }

    function handleStatisticsCardClick(type: 'template' | 'category' | 'member', id: string | null, name: string) {
        // Navigate to statistics page with filter parameters
        const searchParams = new URLSearchParams();
        searchParams.set('filterType', type);
        searchParams.set('filterName', name);

        // Preserve current date filter if any
        if (filterType && filterType !== 'all') {
            searchParams.set('filter', filterType);
            if (filterType === 'custom' && params.startDate && params.endDate) {
                searchParams.set('startDate', params.startDate);
                searchParams.set('endDate', params.endDate);
            }
        }

        goto(`/vaults/${vaultId}/statistics?${searchParams.toString()}`);
    }

</script>

<svelte:head>
    <title>{currentVault?.vaults.name || 'Vault'} - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-2 px-4 relative">
    {#if isLoadingVault}
        <!-- Loading State -->
        <div class="flex flex-col items-center justify-center py-16">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p class="mt-4 text-muted-foreground">Loading vault...</p>
        </div>
    {:else if vaultError}
        <!-- API Error State -->
        <Card class="border-destructive">
            <CardContent class="flex flex-col items-center justify-center py-16 px-4">
                <div class="rounded-full bg-destructive/10 p-6 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-destructive" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <h2 class="text-2xl font-semibold mb-2">Failed to load vault</h2>
                <p class="text-muted-foreground text-center max-w-md mb-2">
                    An error occurred while loading the vault data.
                </p>
                <p class="text-sm text-destructive text-center max-w-md mb-6">
                    {vaultError?.message || 'Please check your connection and try again.'}
                </p>
                <div class="flex gap-3">
                    <Button variant="outline" onclick={handleBack}>
                        Back to Vaults
                    </Button>
                </div>
            </CardContent>
        </Card>
    {:else if !currentVault}
        <!-- Not Found State -->
        <Card class="border-destructive">
            <CardContent class="flex flex-col items-center justify-center py-16 px-4">
                <div class="rounded-full bg-destructive/10 p-6 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-destructive" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
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
        <!-- Vault Header -->
        <VaultHeader
                vault={currentVault}
                onSetDefaultVault={handleSetDefaultVault}
                onToggleInviteForm={toggleInviteForm}
                onCreateExpense={handleCreateExpense}
                onEditVault={handleEditVault}
        />

        <!-- Invite User Form -->
        <InviteForm
                show={showInviteForm}
                email={inviteEmail}
                role={inviteRole}
                isInviting={isInviting}
                onEmailChange={(value) => inviteEmail = value}
                onRoleChange={(role) => inviteRole = role}
                onSubmit={handleInviteUser}
                onCancel={toggleInviteForm}
        />

        <!-- Expense Filters -->
        <ExpenseFilters
                filterType={filterType}
                startDate={params.startDate}
                endDate={params.endDate}
                onFilterChange={(filter) => { params.filter = filter; }}
                onApplyCustomFilter={() => {}}
                onStartDateChange={(value) => params.startDate = value}
                onEndDateChange={(value) => params.endDate = value}
        />

        <!-- Funds section -->
        {#if fundsResource.loading}
            <div class="mt-4 h-24 rounded-lg border bg-card animate-pulse"></div>
        {:else if fundRows.length > 0}
            <div class="mt-4">
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-sm font-semibold text-muted-foreground">Funds</h2>
                    <button
                        onclick={() => goto(`/vaults/${vaultId}/funds`)}
                        class="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                        Manage →
                    </button>
                </div>
                <div class="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
                    {#each fundRows as row (row.fund.id)}
                        {@const topUp = row.activeCycle?.topUpAmount ?? 0}
                        {@const isLow = topUp > 0 && row.fund.balance / topUp < 0.2}
                        {@const isSelected = selectedFundId === row.fund.id}
                        <button
                            onclick={() => toggleFundFilter(row.fund.id)}
                            class="shrink-0 snap-start w-64 text-left"
                        >
                            <Card class="h-full transition-all {isSelected ? 'ring-2 ring-primary ring-offset-2 bg-primary/5 shadow-md' : 'hover:shadow-md'} {isLow && !isSelected ? 'border-amber-400/60' : ''}"
                                  style={row.fund.color ? `border-left: 3px solid ${row.fund.color}` : ''}>
                                <CardContent class="p-4">
                                    <!-- Name row -->
                                    <div class="flex items-center justify-between gap-2 mb-3 min-w-0">
                                        <div class="flex items-center gap-2 min-w-0 flex-1">
                                            {#if row.fund.icon}
                                                <span class="text-lg shrink-0">{row.fund.icon}</span>
                                            {/if}
                                            <span class="text-sm font-semibold truncate" title={row.fund.name}>{row.fund.name}</span>
                                        </div>
                                        <button
                                            onclick={(e) => { e.stopPropagation(); goto(`/vaults/${vaultId}/funds/${row.fund.id}`); }}
                                            class="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                            title="Open fund"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <!-- Cycle breakdown -->
                                    <div class="space-y-1.5">
                                        <div class="flex items-center justify-between gap-2">
                                            <p class="text-xs text-muted-foreground">Opening</p>
                                            <p class="text-xs tabular-nums">{vaultFormatters.currency(row.activeCycle?.openingBalance ?? 0)}</p>
                                        </div>
                                        <div class="flex items-center justify-between gap-2">
                                            <p class="text-xs text-muted-foreground">Top-ups</p>
                                            <p class="text-xs tabular-nums text-green-600 dark:text-green-400">+{vaultFormatters.currency(topUp)}</p>
                                        </div>
                                        <div class="flex items-center justify-between gap-2">
                                            <p class="text-xs text-muted-foreground">Expenses</p>
                                            <p class="text-xs tabular-nums text-red-600 dark:text-red-400">−{vaultFormatters.currency(row.activeCycle?.totalSpent ?? 0)}</p>
                                        </div>
                                        {#if (row.activeCycle?.totalDeducted ?? 0) > 0}
                                            <div class="flex items-center justify-between gap-2">
                                                <p class="text-xs text-muted-foreground">Deductions</p>
                                                <p class="text-xs tabular-nums text-red-600 dark:text-red-400">−{vaultFormatters.currency(row.activeCycle?.totalDeducted ?? 0)}</p>
                                            </div>
                                        {/if}
                                        {#if (row.activeCycle?.totalReimbursed ?? 0) > 0}
                                            <div class="flex items-center justify-between gap-2">
                                                <p class="text-xs text-muted-foreground">Reimbursed</p>
                                                <p class="text-xs tabular-nums text-orange-600 dark:text-orange-400">−{vaultFormatters.currency(row.activeCycle?.totalReimbursed ?? 0)}</p>
                                            </div>
                                        {/if}
                                    </div>
                                    <!-- Balance -->
                                    <div class="border-t mt-3 pt-2 flex items-center justify-between gap-2">
                                        <p class="text-xs text-muted-foreground">Balance</p>
                                        <p class="text-sm font-bold tabular-nums {isLow ? 'text-amber-500' : ''}">{vaultFormatters.currency(row.fund.balance)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </button>
                    {/each}
                </div>
            </div>
        {:else if !fundsResource.error}
            <div class="mt-4">
                <button
                    class="w-full text-left"
                    onclick={() => goto(`/vaults/${vaultId}/funds`)}
                >
                    <div class="flex items-center justify-between rounded-lg border border-dashed bg-card px-4 py-3 hover:shadow-sm transition-shadow">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">💰</span>
                            <span class="text-sm text-muted-foreground">No funds yet — create one to track a money pool</span>
                        </div>
                        <span class="text-muted-foreground text-sm shrink-0">→</span>
                    </div>
                </button>
            </div>
        {/if}

        <!-- Recent activity -->
        <div class="mt-6">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3 min-w-0">
                    <h2 class="text-sm font-semibold text-muted-foreground">Recent activity</h2>
                    {#if statistics}
                        <span class="text-xs text-muted-foreground whitespace-nowrap">
                            · {statistics.total.count} · <span class="font-mono">{vaultFormatters.currency(statistics.total.amount)}</span>
                        </span>
                    {/if}
                </div>
                <a
                    href="/vaults/{vaultId}/expenses{page.url.search}"
                    class="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
                >
                    View all
                    <ArrowRight class="size-3" />
                </a>
            </div>

            {#if selectedFundId}
                {@const selectedFund = fundRows.find(r => r.fund.id === selectedFundId)}
                <div class="flex items-center gap-2 mb-2 px-1">
                    <span class="text-xs text-muted-foreground">Filtering by fund:</span>
                    <span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {#if selectedFund?.fund.icon}{selectedFund.fund.icon}{/if}
                        {selectedFund?.fund.name ?? selectedFundId}
                        <button onclick={() => { params.fundId = ''; }} class="ml-1 hover:text-primary/70" aria-label="Clear fund filter">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </span>
                </div>
            {/if}

            {#if isLoadingExpenses}
                <div class="flex justify-center py-12">
                    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            {:else}
                <RecentExpenses
                    expenses={expenses}
                    limit={10}
                    onSelect={(e) => handleEditExpense(e.id)}
                    formatCurrency={vaultFormatters.currency}
                    formatDate={vaultFormatters.date}
                />
                {#if expenses.length > 10}
                    <div class="mt-3 text-center">
                        <a
                            href="/vaults/{vaultId}/expenses{page.url.search}"
                            class="text-sm font-medium text-primary hover:underline"
                        >
                            View all {statistics?.total.count ?? expenses.length} expenses →
                        </a>
                    </div>
                {/if}
            {/if}
        </div>

    {/if}
</div>

<Toaster />