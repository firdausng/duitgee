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
    import { FundBudgetHero } from '$lib/components/ui/fund-budget-hero';
    import { FundPolicyLine } from '$lib/components/ui/fund-policy-line';
    import { BreakdownBars, type BreakdownRow } from '$lib/components/ui/breakdown-bars';
    import { TransferSheet, type TransferSheetFund } from '$lib/components/ui/transfer-sheet';
    import { createVaultFormatters } from '$lib/vaultFormatting';
    import type { VaultWithMember } from '$lib/schemas/read/vaultWithMember';
    import type { Expense } from '../../types';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
    import Archive from '@lucide/svelte/icons/archive';
    import Plus from '@lucide/svelte/icons/plus';
    import Minus from '@lucide/svelte/icons/minus';

    let { vaultId, fundId } = page.params;

    let refetchKey = $state(0);
    let showArchiveConfirm = $state(false);
    let isArchiving = $state(false);
    let transferOpen = $state(false);

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
    const carryOverFundName = $derived(fundResource.current?.carryOverFundName ?? null);
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

    // Cycle expenses for the category breakdown. Active-cycle window uses
    // the cycle's period; for manual funds (sentinel 2099 periodEnd) we
    // include everything ever tagged to the fund.
    const cycleExpensesResource = resource(
        () => [
            vaultId,
            fundId,
            activeCycle?.periodStart ?? null,
            activeCycle?.periodEnd ?? null,
            refetchKey,
        ] as const,
        async ([vid, fid, start, end]) => {
            if (!vid || !fid) return [];
            const qs = new URLSearchParams({ vaultId: vid, fundId: fid, page: '1', limit: '500' });
            if (start) qs.append('startDate', start);
            if (end && !end.startsWith('2099')) qs.append('endDate', end);
            const response = await ofetch<{ expenses: Expense[] }>(`/api/getExpenses?${qs.toString()}`);
            return response.expenses ?? [];
        },
    );
    const cycleExpenses = $derived(cycleExpensesResource.current ?? []);

    // Vault funds list — populates the Transfer sheet's To picker.
    const vaultFundsResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([vid]) => {
            if (!vid) return [];
            const r = await ofetch<{ success: boolean; data: Array<{ fund: TransferSheetFund }> }>(
                `/api/getFunds?vaultId=${vid}`,
            );
            return (r.data ?? []).map((row) => row.fund);
        },
    );
    const vaultFunds = $derived(vaultFundsResource.current ?? []);
    const hasTransferTargets = $derived(
        vaultFunds.filter((f) => f.status === 'active' && f.id !== fundId).length > 0,
    );

    const categoryRows = $derived.by<BreakdownRow[]>(() => {
        const map = new Map<string, BreakdownRow>();
        for (const e of cycleExpenses) {
            const key = e.category?.name ?? '__uncategorized__';
            const row = map.get(key);
            if (row) {
                row.value += e.amount;
                row.count += 1;
            } else {
                map.set(key, {
                    id: key,
                    label: e.category?.name ?? 'Uncategorized',
                    icon: e.category?.icon ?? null,
                    color: e.category?.color ?? null,
                    value: e.amount,
                    count: 1,
                });
            }
        }
        return Array.from(map.values());
    });

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
        // Deep-link into the canonical vault-level reimbursements UX,
        // pre-filtered to this fund. Users can clear the filter there to
        // see vault-wide pending items.
        goto(`/vaults/${vaultId}/reimbursements?fundId=${fundId}`);
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
        <!-- Fund identity strip (icon + description + archived badge) -->
        <div
            class="rounded-[var(--radius-md)] border bg-card px-4 py-3 mb-4 flex items-center gap-3"
            style={fund.color ? `border-left: 4px solid ${fund.color}` : ''}
        >
            {#if fund.icon}
                <span class="text-2xl leading-none shrink-0">{fund.icon}</span>
            {/if}
            <div class="min-w-0 flex-1">
                {#if fund.description}
                    <p class="text-sm text-muted-foreground truncate">{fund.description}</p>
                {:else}
                    <p class="text-sm text-muted-foreground">No description.</p>
                {/if}
            </div>
            {#if fund.status === 'archived'}
                <span class="shrink-0 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    Archived
                </span>
            {/if}
        </div>

        <!-- Budget hero (progress + spent/budget + breakdown disclosure) -->
        <div class="mb-3">
            <FundBudgetHero
                {fund}
                cycle={activeCycle}
                {policy}
                formatCurrency={vaultFormatters.currency}
            />
        </div>

        <!-- Policy line -->
        {#if policy}
            <div class="mb-4">
                <FundPolicyLine
                    {fund}
                    cycle={activeCycle}
                    {policy}
                    formatCurrency={vaultFormatters.currency}
                    {carryOverFundName}
                    onEdit={fund.status !== 'archived' ? handleEdit : undefined}
                />
            </div>
        {/if}

        <!-- Category breakdown -->
        <Card class="mb-4">
            <CardHeader class="pb-2">
                <CardTitle class="text-base">Where the money went</CardTitle>
            </CardHeader>
            <CardContent class="px-2 pb-2">
                {#if cycleExpensesResource.loading}
                    <div class="flex justify-center py-6">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                {:else}
                    <BreakdownBars
                        rows={categoryRows}
                        limit={5}
                        formatCurrency={vaultFormatters.currency}
                        emptyTitle="No expenses tagged to this fund yet."
                        class="border-0"
                    />
                {/if}
            </CardContent>
        </Card>

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
            <!-- Primary: Top Up + Deduct + Transfer -->
            <div class="flex gap-2">
                <Button onclick={handleTopUp} class="flex-1">
                    <Plus class="size-4" />
                    Top Up
                </Button>
                <Button variant="outline" onclick={handleDeduct} class="flex-1">
                    <Minus class="size-4" />
                    Deduct
                </Button>
                <Button
                    variant="outline"
                    onclick={() => (transferOpen = true)}
                    disabled={!hasTransferTargets}
                    class="flex-1"
                    title={hasTransferTargets ? 'Transfer balance to another fund' : 'No other active funds to transfer to'}
                >
                    <ArrowLeftRight class="size-4" />
                    Transfer
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

{#if fund && fundId && vaultId}
    <TransferSheet
        open={transferOpen}
        vaultId={vaultId}
        fromFundId={fundId}
        funds={vaultFunds}
        formatCurrency={vaultFormatters.currency}
        onOpenChange={(v) => (transferOpen = v)}
        onSuccess={() => refetchKey++}
    />
{/if}

<Toaster />
