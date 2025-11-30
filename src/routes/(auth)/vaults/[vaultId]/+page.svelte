<script lang="ts">
	import {onMount} from "svelte";
    import {goto} from "$app/navigation";
    import {ofetch} from "ofetch";
    import type {VaultWithMember} from "$lib/schemas/read/vaultWithMember";
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";

    let { data } = $props();
    let { url, vaultId } = data;

    type Expense = {
        id: string;
        vaultId: string;
        note: string | null;
        amount: number;
        category: {
            name: string;
            description: string;
            icon: string;
            iconType: string;
            color: string;
            isPublic: boolean,
            group: string;
        }
        paidBy: string | null;
        date: string;
        createdAt: string | null;
        createdBy: string;
        updatedAt: string | null;
        updatedBy: string | null;
        deletedAt: string | null;
        deletedBy: string | null;
    };

    let currentVault = $state<VaultWithMember>();
    let expenses = $state<Expense[]>([]);
    let isLoadingVault = $state(true);
    let isLoadingExpenses = $state(true);

    onMount(async()=>{
        // Load vault data
        try {
            const response = await ofetch<{success: boolean, data: VaultWithMember}>(`/api/getVault?vaultId=${vaultId}`);
            currentVault = response.data;
        } catch (error) {
            console.error('Failed to fetch vault:', error);
        } finally {
            isLoadingVault = false;
        }

        // Load expenses
        try {
            const response = await ofetch<{expenses: Expense[], pagination: any}>(`/api/getExpenses?vaultId=${vaultId}&page=1&limit=50`);
            expenses = response.expenses || [];
        } catch (error) {
            console.error('Failed to fetch expenses:', error);
        } finally {
            isLoadingExpenses = false;
        }
    });

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
                headers: { 'Content-Type': 'application/json' }
            });

            // Refresh expenses list
            const response = await ofetch<{expenses: Expense[], pagination: any}>(`/api/getExpenses?vaultId=${vaultId}&page=1&limit=50`);
            expenses = response.expenses || [];
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
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
        <!-- Minimal Header -->
        <div class="mb-6">
            <Button variant="ghost" onclick={handleBack} class="mb-4 -ml-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                </svg>
                Back to Vaults
            </Button>

            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div
                        class="text-3xl w-14 h-14 rounded-lg flex items-center justify-center"
                        style="background-color: {currentVault.vaults.color}20;"
                    >
                        {currentVault.vaults.icon || '🏦'}
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold">{currentVault.vaults.name}</h1>
                        {#if currentVault.vaults.description}
                            <p class="text-sm text-muted-foreground">{currentVault.vaults.description}</p>
                        {/if}
                    </div>
                </div>
                <Button onclick={handleCreateExpense}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                    </svg>
                    Add Expense
                </Button>
            </div>
        </div>

        <!-- Expenses Table -->
        <Card>
            <CardHeader>
                <CardTitle>Expenses</CardTitle>
                <CardDescription>All expenses in this vault</CardDescription>
            </CardHeader>
            <CardContent>
                {#if isLoadingExpenses}
                    <div class="flex justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                {:else if expenses.length === 0}
                    <div class="text-center py-12">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                        </svg>
                        <p class="text-muted-foreground mb-4">No expenses yet</p>
                        <Button onclick={handleCreateExpense}>Create your first expense</Button>
                    </div>
                {:else}
                    <div class="space-y-3">
                        {#each expenses as expense (expense.id)}
                            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
                                <div class="flex items-start justify-between gap-4">
                                    <!-- Left section: Content -->
                                    <div class="flex-1 min-w-0">
                                        <!-- Amount and Date -->
                                        <div class="flex items-start justify-between gap-2 mb-2">
                                            <div class="text-2xl font-bold">
                                                {formatCurrency(expense.amount)}
                                            </div>
                                            <div class="text-sm text-muted-foreground whitespace-nowrap">
                                                {formatDate(expense.date)}
                                            </div>
                                        </div>

                                        <!-- Description -->
                                        <div class="font-medium mb-1 truncate">
                                            {expense.note || 'No description'}
                                        </div>

                                        <!-- Category and Paid By -->
                                        <div class="flex flex-wrap items-center gap-2 text-sm">
                                            {#if expense.category.name}
                                                <span class="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                                    {expense.category.name}
                                                </span>
                                            {/if}
                                            {#if expense.paidBy}
                                                <span class="text-xs text-muted-foreground">
                                                    Paid by: {expense.paidBy}
                                                </span>
                                            {/if}
                                        </div>
                                    </div>

                                    <!-- Right section: Actions -->
                                    <div class="flex flex-col gap-1 flex-shrink-0">
                                        <button
                                            class="p-2 hover:bg-accent rounded-md transition-colors"
                                            onclick={() => handleEditExpense(expense.id)}
                                            aria-label="Edit expense"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        <button
                                            class="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                                            onclick={() => handleDeleteExpense(expense.id)}
                                            aria-label="Delete expense"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </CardContent>
        </Card>
    {/if}
</div>