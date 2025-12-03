<script lang="ts">
    import {goto} from "$app/navigation";
    import {useSearchParams} from "runed/kit";
    import {ofetch} from "ofetch";
    import {resource} from "runed";
    import type {VaultWithMember} from "$lib/schemas/read/vaultWithMember";
    import {Button} from "$lib/components/ui/button";
    import {Card, CardContent} from "$lib/components/ui/card";
    import {filterSchema} from "./schemas";
    import type {Expense, VaultStatistics} from "./types";
    import VaultHeader from "./VaultHeader.svelte";
    import ExpenseFilters from "./ExpenseFilters.svelte";
    import VaultStatisticsComponent from "./VaultStatistics.svelte";
    import ExpenseList from "./ExpenseList.svelte";
    import InviteForm from "./InviteForm.svelte";

    let {data} = $props();
    let {vaultId} = data;

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
    let filterType = $derived(params.filter);

    function getDateRange(): { startDate?: string; endDate?: string } {
        const now = new Date();

        switch (filterType) {
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

    // Resource for expenses - auto-refetches when filter changes
    const expensesResource = resource(
        () => [vaultId, filterType, params.startDate, params.endDate, refetchKey] as const,
        async ([id, filter, startDate, endDate]) => {
            const dateRange = getDateRange();
            const urlParams = new URLSearchParams({
                vaultId: id,
                page: '1',
                limit: '50'
            });

            if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
            if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);

            const response = await ofetch<{ expenses: Expense[], pagination: any }>(`/api/getExpenses?${urlParams.toString()}`);
            return response.expenses || [];
        }
    );

    // Resource for statistics - auto-refetches when filter changes
    const statisticsResource = resource(
        () => [vaultId, filterType, params.startDate, params.endDate, refetchKey] as const,
        async ([id, filter, startDate, endDate]) => {
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
            day: 'numeric'
        });
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

</script>

<svelte:head>
    <title>{currentVault?.vaults.name || 'Vault'} - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-8 px-4 max-w-7xl">
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
        <!-- Vault Header -->
        <VaultHeader
                vault={currentVault}
                onSetDefaultVault={handleSetDefaultVault}
                onToggleInviteForm={toggleInviteForm}
                onCreateExpense={handleCreateExpense}
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

        <!-- Vault Statistics -->
        <VaultStatisticsComponent
                statistics={statistics}
                isLoading={isLoadingStats}
                formatCurrency={formatCurrency}
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

        <!-- Expenses List -->
        <ExpenseList
                expenses={expenses}
                isLoading={isLoadingExpenses}
                filterType={filterType}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
                onCreateExpense={handleCreateExpense}
        />
    {/if}
</div>