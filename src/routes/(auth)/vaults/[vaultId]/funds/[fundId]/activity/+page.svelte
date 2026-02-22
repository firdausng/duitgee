<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { useSearchParams } from 'runed/kit';
    import * as v from 'valibot';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import FundTransactionList from '$lib/components/fund-activity/FundTransactionList.svelte';
    import FundTypeFilter from '$lib/components/fund-activity/FundTypeFilter.svelte';
    import type { FundTransaction } from '$lib/components/fund-activity/FundTransactionList.svelte';

    let { vaultId, fundId } = page.params;

    const DEFAULT_TYPES = ['top_up', 'deduction', 'transfer_in', 'transfer_out'];
    const PAGE_SIZE_OPTIONS = [10, 30, 50, 100];

    const filterSchema = v.object({
        types: v.optional(v.string(), DEFAULT_TYPES.join(',')),
        page: v.optional(v.pipe(v.string(), v.transform(Number)), '1'),
        limit: v.optional(v.pipe(v.string(), v.transform(Number)), '30'),
    });
    const params = useSearchParams(filterSchema);

    const selectedTypes = $derived(
        params.types ? params.types.split(',').filter(Boolean) : DEFAULT_TYPES
    );

    function handleTypesChange(types: string[]) {
        params.types = types.join(',');
        params.page = 1;
    }

    function handleLimitChange(newLimit: number) {
        params.limit = newLimit;
        params.page = 1;
    }

    function goToPage(p: number) {
        params.page = p;
    }

    // Fund name resource
    const fundResource = resource(
        () => [vaultId, fundId] as const,
        async ([vid, fid]) => {
            const r = await ofetch<{ success: boolean; data: any }>(`/api/getFund?vaultId=${vid}&id=${fid}`);
            return r.data?.fund ?? null;
        }
    );
    const fund = $derived(fundResource.current);

    // Transactions resource — replaces list on each page change
    type TxResponse = {
        transactions: FundTransaction[];
        pagination: { page: number; limit: number; total: number; pages: number };
    };
    const txResource = resource(
        () => [vaultId, fundId, params.types, params.page, params.limit] as const,
        async ([vid, fid, types, pg, lim]) => {
            const urlParams = new URLSearchParams({
                vaultId: vid,
                fundId: fid,
                page: String(pg),
                limit: String(lim),
            });
            if (types) urlParams.set('types', types);
            const r = await ofetch<{ success: boolean; data: TxResponse }>(`/api/getFundTransactions?${urlParams}`);
            return r.data;
        }
    );

    const isLoading = $derived(txResource.loading);
    const error = $derived(txResource.error);
    const transactions = $derived(txResource.current?.transactions ?? []);
    const pagination = $derived(txResource.current?.pagination ?? null);

    $effect(() => {
        if (error) toast.error('Failed to load activity.');
    });

    function handleBack() {
        goto(`/vaults/${vaultId}/funds/${fundId}`);
    }
</script>

<svelte:head>
    <title>{fund?.name ?? 'Fund'} Activity - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <div class="mb-1">
        <Button variant="ghost" size="sm" onclick={handleBack} class="-ml-2">← Back</Button>
    </div>
    <h1 class="text-2xl font-bold mb-6">{fund?.name ?? 'Fund'} Activity</h1>

    <!-- Type filter -->
    <div class="mb-4">
        <FundTypeFilter {selectedTypes} onchange={handleTypesChange} />
    </div>

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
                <p class="text-destructive mb-4">Failed to load activity.</p>
                <Button variant="outline" onclick={() => { params.page = 1; }}>Retry</Button>
            </CardContent>
        </Card>
    {:else}
        <FundTransactionList {transactions} />

        {#if pagination && pagination.pages > 1}
            <div class="flex items-center justify-between mt-4">
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
            <p class="text-xs text-muted-foreground text-center mt-3">
                {pagination.total} {pagination.total === 1 ? 'record' : 'records'}
            </p>
        {/if}
    {/if}
</div>

<Toaster />
