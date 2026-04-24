<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { CheckboxRow } from '$lib/components/ui/checkbox-row';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';
    import { createVaultFormatters } from '$lib/vaultFormatting';
    import type { VaultWithMember } from '$lib/schemas/read/vaultWithMember';
    import {
        computeFundSummary,
        nextRefillDate,
        daysUntilPhrase,
        type CycleLike,
        type PolicyLike,
    } from '$lib/utils/fund-summary';

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
        activeCycle: CycleLike | null;
        policy: PolicyLike | null;
    };

    const vaultResource = resource(
        () => [vaultId] as const,
        async ([id]) => {
            const response = await ofetch<{ success: boolean; data: VaultWithMember }>(`/api/getVault?vaultId=${id}`);
            return response.data;
        },
    );

    const vaultFormatters = $derived(
        vaultResource.current
            ? createVaultFormatters({
                locale: vaultResource.current.vaults.locale || 'en-US',
                currency: vaultResource.current.vaults.currency || 'USD',
            })
            : createVaultFormatters({ locale: 'en-US', currency: 'USD' }),
    );

    const fundsResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const response = await ofetch<{ success: boolean; data: FundRow[] }>(`/api/getFunds?vaultId=${id}`);
            return response.data ?? [];
        }
    );

    const fundRows = $derived(fundsResource.current ?? []);
    const archivedCount = $derived(fundRows.filter((r) => r.fund.status === 'archived').length);
    let showArchivedFunds = $state(false);
    const visibleRows = $derived(
        showArchivedFunds ? fundRows : fundRows.filter((r) => r.fund.status === 'active'),
    );
    const isLoading = $derived(fundsResource.loading);
    const error = $derived(fundsResource.error);

    function summaryFor(row: FundRow) {
        return computeFundSummary(row.fund, row.activeCycle, row.policy);
    }

    function barColorFor(pct: number | null): string {
        if (pct == null) return 'var(--primary)';
        if (pct >= 1) return 'var(--amount-negative)';
        if (pct >= 0.9) return 'var(--accent-strong)';
        return 'var(--primary)';
    }

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
    {:else if fundRows.length === 0}
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
            <CheckboxRow bind:checked={showArchivedFunds} class="mb-4 w-fit">
                {#snippet label()}
                    <span class="text-sm font-normal text-muted-foreground">
                        Show archived funds ({archivedCount})
                    </span>
                {/snippet}
            </CheckboxRow>
        {/if}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each visibleRows as row (row.fund.id)}
                {@const fund = row.fund}
                {@const summary = summaryFor(row)}
                {@const refill = nextRefillDate(row.activeCycle, row.policy)}
                {@const refillPhrase = daysUntilPhrase(refill)}
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
                        <CardContent class="space-y-2">
                            {#if fund.description}
                                <p class="text-sm text-muted-foreground line-clamp-2">{fund.description}</p>
                            {/if}

                            <!-- Balance (always) -->
                            <div>
                                <p class="font-mono text-2xl font-bold tabular-nums">
                                    {vaultFormatters.currency(fund.balance)}
                                </p>
                                <p class="text-xs text-muted-foreground">Balance</p>
                            </div>

                            {#if summary.isManual}
                                <!-- Manual fund caption -->
                                <p class="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                                    <RefreshCw class="size-3" />
                                    Manual fund · no cycle
                                </p>
                            {:else if summary.percentUsed != null}
                                <!-- Progress bar -->
                                <div class="pt-1">
                                    <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div
                                            class="h-full rounded-full transition-all duration-500"
                                            style="width: {(summary.percentUsed * 100).toFixed(1)}%; background: {barColorFor(summary.percentUsed)};"
                                        ></div>
                                    </div>
                                    <p class="text-xs text-muted-foreground mt-1 tabular-nums">
                                        {(summary.percentUsed * 100).toFixed(0)}% of {vaultFormatters.currency(summary.budget)}
                                    </p>
                                </div>
                                <!-- Days left + next refill -->
                                {#if summary.daysLeft != null || refillPhrase}
                                    <p class="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                                        {#if summary.daysLeft != null}
                                            <span>
                                                {summary.daysLeft} {summary.daysLeft === 1 ? 'day' : 'days'} left
                                            </span>
                                        {/if}
                                        {#if summary.daysLeft != null && refillPhrase}
                                            <span aria-hidden="true">·</span>
                                        {/if}
                                        {#if refillPhrase}
                                            <span class="inline-flex items-center gap-1">
                                                <RefreshCw class="size-3" />
                                                Refills {refillPhrase}
                                            </span>
                                        {/if}
                                    </p>
                                {/if}
                            {/if}
                        </CardContent>
                    </Card>
                </button>
            {/each}
        </div>
    {/if}
</div>

<Toaster />
