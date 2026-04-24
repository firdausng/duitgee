<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { useSearchParams } from 'runed/kit';
    import * as v from 'valibot';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';

    let { vaultId, fundId } = page.params;

    const PAGE_SIZE_OPTIONS = [10, 30, 50];

    const filterSchema = v.object({
        page: v.optional(v.pipe(v.string(), v.transform(Number)), '1'),
        limit: v.optional(v.pipe(v.string(), v.transform(Number)), '10'),
    });
    const params = useSearchParams(filterSchema);

    function handleLimitChange(newLimit: number) {
        params.limit = newLimit;
        params.page = 1;
    }

    function goToPage(p: number) {
        params.page = p;
    }

    type Cycle = {
        id: string;
        fundId: string;
        periodStart: string;
        periodEnd: string;
        status: string;
        openingBalance: number;
        closingBalance: number | null;
        topUpAmount: number;
        totalSpent: number;
        totalReimbursed: number;
        totalDeducted: number;
        effectiveBalance: number;
        createdAt: string;
    };

    type CyclesResponse = {
        cycles: Cycle[];
        historyAllowed: boolean;
        pagination: { page: number; limit: number; total: number; pages: number };
    };

    const cyclesResource = resource(
        () => [vaultId, fundId, params.page, params.limit] as const,
        async ([vid, fid, pg, lim]) => {
            const response = await ofetch<{ success: boolean; data: CyclesResponse }>(
                `/api/getFundCycles?vaultId=${vid}&fundId=${fid}&page=${pg}&limit=${lim}`
            );
            return response.data;
        }
    );

    const cycles = $derived(cyclesResource.current?.cycles ?? []);
    const historyAllowed = $derived(cyclesResource.current?.historyAllowed ?? false);
    const pagination = $derived(cyclesResource.current?.pagination ?? null);
    const isLoading = $derived(cyclesResource.loading);
    const error = $derived(cyclesResource.error);

    $effect(() => {
        if (error) toast.error('Failed to load cycle history.');
    });

    function handleBack() {
        goto(`/vaults/${vaultId}/funds/${fundId}`);
    }

    function formatPeriod(start: string, end: string): string {
        const s = new Date(start).toLocaleDateString();
        if (end.startsWith('2099')) return `${s} — Ongoing`;
        return `${s} — ${new Date(end).toLocaleDateString()}`;
    }

    function fmt(n: number) {
        return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function netChange(c: Cycle): number {
        return c.effectiveBalance - c.openingBalance;
    }
</script>

<svelte:head>
    <title>Cycle History - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
        <h1 class="text-2xl font-bold mb-6">Cycle History</h1>

    {#if cyclesResource.current && !historyAllowed}
        <div class="mb-4 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            Past cycles are hidden on the free plan. Only the active cycle is shown.
        </div>
    {/if}

    <!-- Per-page selector -->
    <div class="flex items-center gap-2 mb-4">
        <span class="text-xs text-muted-foreground">Per page:</span>
        {#each PAGE_SIZE_OPTIONS as size}
            <button
                onclick={() => handleLimitChange(size)}
                class="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium transition-colors
                    {params.limit === size
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-muted-foreground hover:border-primary/50'}"
            >
                {size}
            </button>
        {/each}
    </div>

    {#if isLoading}
        <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
    {:else if error}
        <Card class="border-destructive">
            <CardContent class="flex flex-col items-center justify-center py-12">
                <p class="text-destructive mb-4">Failed to load cycle history.</p>
                <Button variant="outline" onclick={() => { params.page = 1; }}>Retry</Button>
            </CardContent>
        </Card>
    {:else if cycles.length === 0}
        <Card>
            <CardContent class="flex flex-col items-center justify-center py-16 text-center">
                <p class="text-muted-foreground">No cycles found.</p>
            </CardContent>
        </Card>
    {:else}
        <div class="space-y-4">
            {#each cycles as cycle (cycle.id)}
                {@const net = netChange(cycle)}
                <Card>
                    <CardHeader class="pb-3">
                        <CardTitle class="text-sm font-medium text-muted-foreground flex items-center gap-2 flex-wrap">
                            {formatPeriod(cycle.periodStart, cycle.periodEnd)}
                            {#if cycle.status === 'active'}
                                <span class="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">Active</span>
                            {/if}
                        </CardTitle>
                    </CardHeader>
                    <CardContent class="pt-0">
                        <!-- Breakdown rows -->
                        <div class="space-y-1 text-sm mb-3">
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Opening Balance</span>
                                <span class="tabular-nums">{fmt(cycle.openingBalance)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Top-ups</span>
                                <span class="tabular-nums text-green-600 dark:text-green-400">+{fmt(cycle.topUpAmount)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Expenses</span>
                                <span class="tabular-nums text-red-600 dark:text-red-400">−{fmt(cycle.totalSpent)}</span>
                            </div>
                            {#if cycle.totalDeducted > 0}
                                <div class="flex justify-between">
                                    <span class="text-muted-foreground">Deductions</span>
                                    <span class="tabular-nums text-red-600 dark:text-red-400">−{fmt(cycle.totalDeducted)}</span>
                                </div>
                            {/if}
                            {#if cycle.totalReimbursed > 0}
                                <div class="flex justify-between">
                                    <span class="text-muted-foreground">Reimbursed</span>
                                    <span class="tabular-nums text-orange-600 dark:text-orange-400">−{fmt(cycle.totalReimbursed)}</span>
                                </div>
                            {/if}
                        </div>

                        <!-- Divider + balance row -->
                        <div class="border-t pt-2 flex justify-between items-center">
                            <span class="text-sm font-medium">
                                {cycle.status === 'active' ? 'Current Balance' : 'Closing Balance'}
                            </span>
                            <div class="text-right">
                                <span class="text-base font-bold tabular-nums">{fmt(cycle.effectiveBalance)}</span>
                                {#if net !== 0}
                                    <span class="text-xs ml-2 tabular-nums {net > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                        {net > 0 ? '+' : '−'}{fmt(Math.abs(net))}
                                    </span>
                                {/if}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            {/each}
        </div>

        <!-- Pagination -->
        {#if pagination && pagination.pages > 1}
            <div class="flex items-center justify-between mt-6">
                <Button
                    variant="outline"
                    size="sm"
                    onclick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                >
                    ← Prev
                </Button>

                <span class="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                    &nbsp;·&nbsp;
                    {pagination.total} total
                </span>

                <Button
                    variant="outline"
                    size="sm"
                    onclick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                >
                    Next →
                </Button>
            </div>
        {:else if pagination}
            <p class="text-xs text-muted-foreground text-center mt-4">
                {pagination.total} {pagination.total === 1 ? 'cycle' : 'cycles'} total
            </p>
        {/if}
    {/if}
</div>

<Toaster />
