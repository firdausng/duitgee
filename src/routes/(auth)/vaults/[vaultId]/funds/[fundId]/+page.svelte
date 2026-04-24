<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import FundTransactionList from '$lib/components/fund-activity/FundTransactionList.svelte';
    import type { FundTransaction } from '$lib/components/fund-activity/FundTransactionList.svelte';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import Archive from '@lucide/svelte/icons/archive';
    import Plus from '@lucide/svelte/icons/plus';
    import Minus from '@lucide/svelte/icons/minus';

    let { vaultId, fundId } = page.params;

    let refetchKey = $state(0);
    let showArchiveConfirm = $state(false);
    let isArchiving = $state(false);

    const fundResource = resource(
        () => [vaultId, fundId, refetchKey] as const,
        async ([vid, fid]) => {
            const response = await ofetch<{ success: boolean; data: any }>(`/api/getFund?vaultId=${vid}&id=${fid}`);
            return response.data;
        }
    );

    const fund = $derived(fundResource.current?.fund ?? null);
    const policy = $derived(fundResource.current?.policy ?? null);
    const activeCycle = $derived(fundResource.current?.activeCycle ?? null);
    const isLoading = $derived(fundResource.loading);
    const error = $derived(fundResource.error);

    const DEFAULT_PREVIEW_TYPES = 'top_up,deduction,transfer_in,transfer_out';

    const recentActivityResource = resource(
        () => [vaultId, fundId, refetchKey] as const,
        async ([vid, fid]) => {
            const r = await ofetch<{ success: boolean; data: { transactions: FundTransaction[] } }>(
                `/api/getFundTransactions?vaultId=${vid}&fundId=${fid}&limit=10&types=${DEFAULT_PREVIEW_TYPES}`
            );
            return r.data?.transactions ?? [];
        }
    );
    const recentActivity = $derived(recentActivityResource.current ?? []);

    $effect(() => {
        if (error) toast.error('Failed to load fund.');
    });

    function handleBack() {
        goto(`/vaults/${vaultId}/funds`);
    }

    function handleEdit() {
        goto(`/vaults/${vaultId}/funds/${fundId}/edit`);
    }

    function handleTopUp() {
        goto(`/vaults/${vaultId}/funds/${fundId}/topup`);
    }

    function handleDeduct() {
        goto(`/vaults/${vaultId}/funds/${fundId}/deduct`);
    }

    function handleReimbursements() {
        goto(`/vaults/${vaultId}/funds/${fundId}/reimbursements`);
    }

    function handleCycles() {
        goto(`/vaults/${vaultId}/funds/${fundId}/cycles`);
    }

    function handleActivity() {
        goto(`/vaults/${vaultId}/funds/${fundId}/activity`);
    }

    async function handleArchive() {
        if (!showArchiveConfirm) {
            showArchiveConfirm = true;
            return;
        }

        isArchiving = true;
        try {
            const response = await ofetch('/api/archiveFund', {
                method: 'POST',
                body: { id: fundId, vaultId },
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.success === false) {
                toast.error(response.error || 'Failed to archive fund');
                return;
            }
            toast.success('Fund archived');
            goto(`/vaults/${vaultId}/funds`);
        } catch (err: any) {
            toast.error(err?.data?.error || err?.message || 'Failed to archive fund');
        } finally {
            isArchiving = false;
            showArchiveConfirm = false;
        }
    }

    function replenishmentTypeLabel(type: string | null) {
        switch (type) {
            case 'fixed_amount': return 'Fixed Amount';
            case 'top_to_ceiling': return 'Top to Ceiling';
            default: return 'Manual';
        }
    }
</script>

<svelte:head>
    <title>{fund?.name ?? 'Fund'} - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
        <div class="flex items-start justify-between gap-2 mb-6">
        <h1 class="text-2xl font-bold min-w-0">{fund?.name ?? 'Fund'}</h1>
        {#if fund?.status !== 'archived'}
            <Button variant="outline" size="sm" onclick={handleEdit} class="shrink-0">Edit</Button>
        {/if}
    </div>

    {#if isLoading}
        <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
    {:else if error || !fund}
        <Card class="border-destructive">
            <CardContent class="flex flex-col items-center justify-center py-12">
                <p class="text-destructive mb-4">Failed to load fund details.</p>
                <Button variant="outline" onclick={() => refetchKey++}>Retry</Button>
            </CardContent>
        </Card>
    {:else}
        <!-- Balance Card -->
        <Card class="mb-4" style={fund.color ? `border-left: 4px solid ${fund.color}` : ''}>
            <CardContent class="pt-6">
                <div class="flex items-center gap-3 mb-4">
                    {#if fund.icon}
                        <span class="text-3xl">{fund.icon}</span>
                    {/if}
                    <div>
                        <p class="text-3xl font-bold">
                            {fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p class="text-sm text-muted-foreground">Current Balance</p>
                    </div>
                    {#if fund.status === 'archived'}
                        <span class="ml-auto text-sm bg-muted text-muted-foreground px-3 py-1 rounded-full">
                            Archived
                        </span>
                    {/if}
                </div>
                {#if fund.description}
                    <p class="text-sm text-muted-foreground">{fund.description}</p>
                {/if}
            </CardContent>
        </Card>

        <!-- Active Cycle -->
        {#if activeCycle}
            {@const cycleNet = fund.balance - (activeCycle.openingBalance ?? 0)}
            <Card class="mb-4">
                <CardHeader class="pb-3">
                    <CardTitle class="text-base flex items-center justify-between">
                        <span>Current Cycle</span>
                        <span class="text-xs font-normal text-muted-foreground">
                            {new Date(activeCycle.periodStart).toLocaleDateString()} — {activeCycle.periodEnd.startsWith('2099') ? 'Ongoing' : new Date(activeCycle.periodEnd).toLocaleDateString()}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent class="pt-0">
                    <div class="space-y-1.5 text-sm mb-3">
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Opening Balance</span>
                            <span class="tabular-nums">{(activeCycle.openingBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Top-ups</span>
                            <span class="tabular-nums text-green-600 dark:text-green-400">+{(activeCycle.topUpAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Expenses</span>
                            <span class="tabular-nums text-red-600 dark:text-red-400">−{(activeCycle.totalSpent ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {#if (activeCycle.totalDeducted ?? 0) > 0}
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Deductions</span>
                                <span class="tabular-nums text-red-600 dark:text-red-400">−{(activeCycle.totalDeducted ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        {/if}
                        {#if (activeCycle.totalReimbursed ?? 0) > 0}
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Reimbursed</span>
                                <span class="tabular-nums text-orange-600 dark:text-orange-400">−{(activeCycle.totalReimbursed ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        {/if}
                    </div>
                    <div class="border-t pt-2 flex justify-between items-center">
                        <span class="text-sm font-medium">Current Balance</span>
                        <div class="text-right">
                            <span class="text-base font-bold tabular-nums">{fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            {#if cycleNet !== 0}
                                <span class="text-xs ml-2 tabular-nums {cycleNet > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                    {cycleNet > 0 ? '+' : '−'}{Math.abs(cycleNet).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            {/if}
                        </div>
                    </div>
                </CardContent>
            </Card>
        {/if}

        <!-- Policy -->
        {#if policy}
            <Card class="mb-4">
                <CardHeader>
                    <CardTitle class="text-base">Replenishment Policy</CardTitle>
                </CardHeader>
                <CardContent class="space-y-1 text-sm">
                    <p><span class="text-muted-foreground">Type:</span> {replenishmentTypeLabel(policy.replenishmentType)}</p>
                    {#if policy.replenishmentSchedule}
                        <p><span class="text-muted-foreground">Schedule:</span> {policy.replenishmentSchedule}</p>
                    {/if}
                    {#if policy.replenishmentAmount}
                        <p><span class="text-muted-foreground">Amount:</span> {policy.replenishmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    {/if}
                    {#if policy.ceilingAmount}
                        <p><span class="text-muted-foreground">Ceiling:</span> {policy.ceilingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    {/if}
                    {#if policy.carryOverBalance}
                        <p>
                            <span class="text-muted-foreground">Carry Over:</span>
                            Transfer balance to {fundResource.current?.carryOverFundName ?? policy.carryOverFundId} at cycle end
                        </p>
                    {/if}
                </CardContent>
            </Card>
        {/if}

        <!-- Recent Activity -->
        <Card class="mb-4">
            <CardHeader class="pb-2">
                <div class="flex items-center justify-between">
                    <CardTitle class="text-base">Recent Activity</CardTitle>
                    <button
                        onclick={handleActivity}
                        class="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                        View all →
                    </button>
                </div>
            </CardHeader>
            <CardContent class="px-4 pb-3">
                {#if recentActivityResource.loading}
                    <div class="flex justify-center py-4">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                {:else}
                    <FundTransactionList transactions={recentActivity} />
                {/if}
            </CardContent>
        </Card>

        <!-- Actions -->
        {#if fund.status !== 'archived'}
            <!-- Primary: Top Up + Deduct -->
            <div class="flex gap-2">
                <Button onclick={handleTopUp} class="flex-1">
                    <Plus class="size-4" />
                    Top Up
                </Button>
                <Button variant="outline" onclick={handleDeduct} class="flex-1">
                    <Minus class="size-4" />
                    Deduct
                </Button>
            </div>

            <!-- Navigation: list views as inline link rows -->
            <div class="rounded-[var(--radius-md)] border bg-card divide-y overflow-hidden">
                <button
                    type="button"
                    onclick={handleReimbursements}
                    class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left"
                >
                    <span class="text-sm font-medium">Pending reimbursements</span>
                    <ArrowRight class="size-4 text-muted-foreground" />
                </button>
                <button
                    type="button"
                    onclick={handleCycles}
                    class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left"
                >
                    <span class="text-sm font-medium">Cycle history</span>
                    <ArrowRight class="size-4 text-muted-foreground" />
                </button>
                <button
                    type="button"
                    onclick={handleActivity}
                    class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left"
                >
                    <span class="text-sm font-medium">Activity history</span>
                    <ArrowRight class="size-4 text-muted-foreground" />
                </button>
            </div>

            <!-- Destructive: archive -->
            <div>
                {#if showArchiveConfirm}
                    <div class="border border-destructive rounded-[var(--radius-md)] p-4 space-y-3 bg-destructive/5">
                        <p class="text-sm text-destructive font-medium">
                            Archive this fund? The active cycle will be closed and no more top-ups or new expenses can be tagged to it.
                        </p>
                        <div class="flex gap-2">
                            <Button
                                variant="destructive"
                                onclick={handleArchive}
                                disabled={isArchiving}
                                class="flex-1"
                            >
                                {isArchiving ? 'Archiving...' : 'Confirm archive'}
                            </Button>
                            <Button
                                variant="outline"
                                onclick={() => (showArchiveConfirm = false)}
                                disabled={isArchiving}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                {:else}
                    <button
                        type="button"
                        onclick={handleArchive}
                        class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                        <Archive class="size-3.5" />
                        Archive this fund
                    </button>
                {/if}
            </div>
        {:else}
            <div class="rounded-[var(--radius-md)] border bg-card divide-y overflow-hidden">
                <button
                    type="button"
                    onclick={handleCycles}
                    class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left"
                >
                    <span class="text-sm font-medium">Cycle history</span>
                    <ArrowRight class="size-4 text-muted-foreground" />
                </button>
                <button
                    type="button"
                    onclick={handleActivity}
                    class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left"
                >
                    <span class="text-sm font-medium">Activity history</span>
                    <ArrowRight class="size-4 text-muted-foreground" />
                </button>
            </div>
        {/if}
    {/if}
</div>

<Toaster />
