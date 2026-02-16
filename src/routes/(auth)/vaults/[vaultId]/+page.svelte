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
    import VaultStatisticsComponent from "./VaultStatistics.svelte";
    import InviteForm from "./InviteForm.svelte";
    import {LoadingOverlay} from "$lib/components/ui/loading-overlay";
    import {Toaster} from "$lib/components/ui/sonner";
    import {toast} from "svelte-sonner";
    import {localDatetimeToUtcIso, getDateRange, type DateFilter} from "$lib/utils";
    import {createVaultFormatters} from "$lib/vaultFormatting";
    import {page} from "$app/state";
    import { groupExpensesByDate, formatDate } from "./statistics/utils";
    import ExpenseListByDate from "./statistics/ExpenseListByDate.svelte";
    import type { Expense } from "./types";

    let {vaultId} = page.params

    const params = useSearchParams(filterSchema);

    // Refetch keys to trigger data reload (e.g., after delete/update)
    let refetchKey = $state(0);
    let vaultRefetchKey = $state(0);

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
                return [vaultId, filterType, params.startDate, params.endDate, refetchKey] as const;
            }
            return [vaultId, filterType, refetchKey] as const;
        },
        async (deps) => {
            const dateRange = getDateRangeWithCustom();
            const urlParams = new URLSearchParams({
                vaultId: deps[0],
                    ...dateRange
            });

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
                return [vaultId, filterType, params.startDate, params.endDate, refetchKey] as const;
            }
            return [vaultId, filterType, refetchKey] as const;
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

    // Group expenses by date for display
    const expensesByDate = $derived(groupExpensesByDate(expenses));

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
        goto(`/vaults/${vaultId}/expenses/new`);
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

        <div class="mt-4">
            <!-- Vault Statistics -->
            <VaultStatisticsComponent
                    statistics={statistics}
                    isLoading={isLoadingStats}
                    formatCurrency={vaultFormatters.currency}
                    vaultId={vaultId}
                    onCardClick={handleStatisticsCardClick}
            />

            <!-- Expense List -->
            <div class="mt-6">
                {#if isLoadingExpenses}
                    <div class="flex justify-center py-12">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                {:else}
                    <ExpenseListByDate
                        expensesByDate={expensesByDate}
                        onEdit={handleEditExpense}
                        onDelete={handleDeleteExpense}
                        formatCurrency={vaultFormatters.currency}
                        formatDate={formatDate}
                    />
                {/if}
            </div>
        </div>

    {/if}
</div>

<Toaster />