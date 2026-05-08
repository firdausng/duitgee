<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Eyebrow, ChapterNum, Rule, MoneyDisplay } from '$lib/components/almanac';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import FundTransactionList from '$lib/components/fund-activity/FundTransactionList.svelte';
    import type { FundTransaction } from '$lib/components/fund-activity/FundTransactionList.svelte';
    import { FundBudgetHero } from '$lib/components/ui/fund-budget-hero';
    import { FundPolicyLine } from '$lib/components/ui/fund-policy-line';
    import { BreakdownBars, type BreakdownRow } from '$lib/components/ui/breakdown-bars';
    import { TransferSheet, type TransferSheetFund } from '$lib/components/ui/transfer-sheet';
    import { shallowModal } from '$lib/utils/shallow-modal.svelte';
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
    let isArchiving = $state(false);

    // Shallow-routed dialogs — back button closes them.
    const archiveConfirm = shallowModal('archiveFund');
    const transferSheet = shallowModal('transfer');

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
    const vaultCurrency = $derived(vaultResource.current?.vaults.currency || 'USD');

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
        if (!archiveConfirm.open) {
            archiveConfirm.push();
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
            archiveConfirm.close();
        }
    }

</script>

<svelte:head>
    <title>{fund?.name ?? 'Fund'} - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
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
        <!-- Almanac masthead — Plate § N · Fund name + Remaining MoneyDisplay -->
        <header class="dg-fund-mast">
            <div class="dg-fund-mast__title-col">
                <ChapterNum>Plate § Fund</ChapterNum>
                <h1 class="dg-fund-mast__title">
                    {#if fund.icon}<span class="dg-fund-mast__icon">{fund.icon}</span>{/if}
                    <em>{fund.name}</em>
                </h1>
                {#if fund.description}
                    <p class="dg-fund-mast__sub">{fund.description}</p>
                {:else}
                    <p class="dg-fund-mast__sub dg-fund-mast__sub--muted">No description.</p>
                {/if}
                {#if fund.status === 'archived'}
                    <span class="dg-fund-mast__archived">— Archived —</span>
                {/if}
            </div>
            <div class="dg-fund-mast__amount-col">
                <Eyebrow tone="muted">Remaining</Eyebrow>
                <div class="dg-fund-mast__amount">
                    <MoneyDisplay
                        amount={fund.balance ?? 0}
                        currency={vaultCurrency}
                        size={48}
                        color="var(--almanac-oxblood)"
                    />
                </div>
                {#if fund.status !== 'archived'}
                    <button type="button" onclick={handleEdit} class="dg-fund-mast__edit">Adjust →</button>
                {/if}
            </div>
        </header>
        <Rule variant="double" />
        <div class="mb-4"></div>

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
        <div class="dg-fund-section">
            <ChapterNum>Plate § Categories</ChapterNum>
            <h2 class="dg-fund-section__title"><em>Where the money went</em></h2>
            <Rule />
        </div>
        <Card class="mb-4">
            <CardContent class="px-2 pb-2 pt-2">
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
        <div class="dg-fund-section">
            <div class="flex items-baseline justify-between gap-2">
                <div>
                    <ChapterNum>Plate § Chronicle</ChapterNum>
                    <h2 class="dg-fund-section__title"><em>Recent activity</em></h2>
                </div>
                <button onclick={handleActivity} class="dg-fund-section__link">View all &rarr;</button>
            </div>
            <Rule />
        </div>
        <Card class="mb-4">
            <CardContent class="px-4 pb-3 pt-2">
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
                    onclick={() => transferSheet.push()}
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
                {#if archiveConfirm.open}
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
                                onclick={() => archiveConfirm.close()}
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
        open={transferSheet.open}
        vaultId={vaultId}
        fromFundId={fundId}
        funds={vaultFunds}
        formatCurrency={vaultFormatters.currency}
        onOpenChange={(v) => transferSheet.bind(v)}
        onSuccess={() => refetchKey++}
    />
{/if}

<Toaster />

<style>
    /* Almanac fund detail — masthead + section headers.
       Sub-components inherit the almanac palette via shadcn cascade. */

    .dg-fund-mast {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.2rem;
        margin-bottom: 0.4rem;
        align-items: start;
    }
    @media (min-width: 720px) {
        .dg-fund-mast { grid-template-columns: 1.4fr 1fr; }
    }
    .dg-fund-mast__title-col { min-width: 0; }
    .dg-fund-mast__title {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 144, 'SOFT' 50, 'wght' 400;
        font-size: clamp(2rem, 4vw, 2.8rem);
        line-height: 1.05;
        letter-spacing: -0.018em;
        color: var(--almanac-ink);
        margin: 0.4rem 0 0.4rem;
        display: flex;
        align-items: baseline;
        gap: 0.6rem;
        flex-wrap: wrap;
    }
    .dg-fund-mast__title em {
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 380;
        color: var(--almanac-oxblood);
    }
    .dg-fund-mast__icon {
        font-style: normal;
        font-size: 0.85em;
        line-height: 1;
    }
    .dg-fund-mast__sub {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 1rem;
        color: var(--almanac-ink-2);
        margin: 0;
    }
    .dg-fund-mast__sub--muted { color: var(--almanac-ink-3); }
    .dg-fund-mast__archived {
        display: inline-block;
        margin-top: 0.6rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--almanac-ink-3);
        border: 1px solid var(--almanac-rule-soft);
        padding: 0.2rem 0.6rem;
    }
    .dg-fund-mast__amount-col {
        text-align: right;
    }
    @media (max-width: 719px) {
        .dg-fund-mast__amount-col { text-align: left; }
    }
    .dg-fund-mast__amount {
        margin-top: 0.4rem;
    }
    .dg-fund-mast__edit {
        margin-top: 0.6rem;
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.9rem;
        color: var(--almanac-ink-2);
        text-decoration: underline;
        text-underline-offset: 3px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
    }
    .dg-fund-mast__edit:hover { color: var(--almanac-oxblood); }

    .dg-fund-section {
        margin: 1.4rem 0 0.6rem;
    }
    .dg-fund-section__title {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 60, 'wght' 380;
        font-size: 1.4rem;
        line-height: 1.1;
        letter-spacing: -0.014em;
        margin: 0.3rem 0 0;
        color: var(--almanac-ink);
    }
    .dg-fund-section__title em {
        font-style: italic;
        color: var(--almanac-ink);
    }
    .dg-fund-section__link {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.85rem;
        color: var(--almanac-ink-2);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        text-decoration: underline;
        text-underline-offset: 3px;
    }
    .dg-fund-section__link:hover { color: var(--almanac-oxblood); }
</style>
