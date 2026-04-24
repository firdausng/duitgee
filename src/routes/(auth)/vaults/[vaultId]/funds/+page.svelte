<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';

    let { vaultId } = page.params;

    let refetchKey = $state(0);

    type FundRow = {
        fund: {
            id: string;
            name: string;
            description: string | null;
            color: string | null;
            icon: string | null;
            balance: number;
            status: string;
        };
        activeCycle: any;
        policy: any;
    };

    const fundsResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const response = await ofetch<{ success: boolean; data: FundRow[] }>(`/api/getFunds?vaultId=${id}`);
            return response.data ?? [];
        }
    );

    const fundRows = $derived(fundsResource.current ?? []);
    const allFunds = $derived(fundRows.map((r) => r.fund));
    const archivedCount = $derived(allFunds.filter(f => f.status === 'archived').length);
    let showArchivedFunds = $state(false);
    const funds = $derived(showArchivedFunds ? allFunds : allFunds.filter(f => f.status === 'active'));
    const isLoading = $derived(fundsResource.loading);
    const error = $derived(fundsResource.error);

    $effect(() => {
        if (error) toast.error('Failed to load funds. Please try again.');
    });

    function handleCreateFund() {
        goto(`/vaults/${vaultId}/funds/new`);
    }

    function handleFundDetail(fundId: string) {
        goto(`/vaults/${vaultId}/funds/${fundId}`);
    }

    function handleTransfer() {
        goto(`/vaults/${vaultId}/transfer`);
    }

    function handleVaultReimbursements() {
        goto(`/vaults/${vaultId}/reimbursements`);
    }

    function handleBack() {
        goto(`/vaults/${vaultId}`);
    }
</script>

<svelte:head>
    <title>Funds - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <!-- Row 1: Back + title + primary action -->
    <div class="flex items-center gap-2 mb-3">
        <h1 class="text-2xl font-bold flex-1">Funds</h1>
        <Button size="sm" onclick={handleCreateFund}>+ New Fund</Button>
    </div>
    <!-- Row 2: Secondary actions -->
    <div class="flex gap-2 mb-6">
        <Button variant="outline" size="sm" class="flex-1" onclick={handleVaultReimbursements}>
            Reimbursements
        </Button>
        <Button variant="outline" size="sm" class="flex-1" onclick={handleTransfer}>
            Transfer
        </Button>
    </div>

    {#if isLoading}
        <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
    {:else if error}
        <Card class="border-destructive">
            <CardContent class="flex flex-col items-center justify-center py-12">
                <p class="text-destructive mb-4">Failed to load funds.</p>
                <Button variant="outline" onclick={() => refetchKey++}>Retry</Button>
            </CardContent>
        </Card>
    {:else if allFunds.length === 0}
        <Card>
            <CardContent class="flex flex-col items-center justify-center py-16 text-center">
                <div class="text-5xl mb-4">💰</div>
                <h2 class="text-xl font-semibold mb-2">No funds yet</h2>
                <p class="text-muted-foreground mb-6 max-w-sm">
                    Create a fund to track a pool of money — groceries budget, petty cash, travel allowance, and more.
                </p>
                <Button onclick={handleCreateFund}>Create your first fund</Button>
            </CardContent>
        </Card>
    {:else}
        {#if archivedCount > 0}
            <label class="flex items-center gap-2 mb-4 cursor-pointer w-fit">
                <input
                    type="checkbox"
                    class="rounded border-input"
                    bind:checked={showArchivedFunds}
                />
                <span class="text-sm text-muted-foreground">Show archived funds ({archivedCount})</span>
            </label>
        {/if}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each funds as fund (fund.id)}
                <button
                    class="text-left w-full"
                    onclick={() => handleFundDetail(fund.id)}
                >
                    <Card class="hover:shadow-md transition-shadow cursor-pointer h-full"
                          style={fund.color ? `border-left: 4px solid ${fund.color}` : ''}>
                        <CardHeader class="pb-2">
                            <CardTitle class="flex items-center gap-2 text-base">
                                {#if fund.icon}
                                    <span class="text-lg">{fund.icon}</span>
                                {/if}
                                <span class="truncate" title={fund.name}>{fund.name}</span>
                                {#if fund.status === 'archived'}
                                    <span class="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                                        Archived
                                    </span>
                                {/if}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {#if fund.description}
                                <p class="text-sm text-muted-foreground mb-3 line-clamp-2">{fund.description}</p>
                            {/if}
                            <p class="text-2xl font-bold">
                                {fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p class="text-xs text-muted-foreground">Balance</p>
                        </CardContent>
                    </Card>
                </button>
            {/each}
        </div>
    {/if}
</div>

<Toaster />
