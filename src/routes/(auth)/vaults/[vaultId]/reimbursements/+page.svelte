<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import X from '@lucide/svelte/icons/x';

    let { vaultId } = page.params;

    let refetchKey = $state(0);
    let selected = $state<Set<string>>(new Set());
    let isSettling = $state(false);

    // Optional fund pre-filter from the ?fundId query param — set when the
    // user arrived via "Pending reimbursements" on a specific fund's detail.
    const fundIdParam = $derived(page.url.searchParams.get('fundId'));

    type PendingRow = {
        transaction: { id: string; fundId: string; expenseId: string | null };
        expense: { id: string; note: string | null; amount: number; date: string; categoryName: string; paymentType: string; paidByName: string | null };
        fund: { id: string; name: string; balance: number; color: string | null; icon: string | null };
    };

    const pendingResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([vid]) => {
            const response = await ofetch<{ success: boolean; data: PendingRow[] }>(
                `/api/getVaultPendingReimbursements?vaultId=${vid}`
            );
            return response.data ?? [];
        }
    );

    const allPending = $derived(pendingResource.current ?? []);
    const pending = $derived(
        fundIdParam ? allPending.filter((p) => p.fund.id === fundIdParam) : allPending,
    );

    // Resolve the fund name independently of pending — we still want a nice
    // strip label when everything's already settled for that fund.
    const filteredFundResource = resource(
        () => [vaultId, fundIdParam] as const,
        async ([vid, fid]) => {
            if (!fid) return null;
            const r = await ofetch<{ success: boolean; data: { fund: { name: string } } }>(
                `/api/getFund?vaultId=${vid}&id=${fid}`,
            );
            return r.data?.fund?.name ?? null;
        },
    );
    const filteredFundName = $derived(
        fundIdParam
            ? allPending.find((p) => p.fund.id === fundIdParam)?.fund.name
                ?? filteredFundResource.current
                ?? null
            : null,
    );
    const isLoading = $derived(pendingResource.loading);
    const error = $derived(pendingResource.error);

    function clearFundFilter() {
        goto(`/vaults/${vaultId}/reimbursements`, { replaceState: true, noScroll: true });
    }

    $effect(() => {
        if (error) toast.error('Failed to load pending reimbursements.');
    });

    // Group by fund for display
    const byFund = $derived(() => {
        const map = new Map<string, { fundName: string; items: PendingRow[] }>();
        for (const item of pending) {
            if (!map.has(item.fund.id)) {
                map.set(item.fund.id, { fundName: item.fund.name, items: [] });
            }
            map.get(item.fund.id)!.items.push(item);
        }
        return Array.from(map.values());
    });

    function toggleSelect(id: string) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        selected = next;
    }

    function selectAll() {
        selected = new Set(pending.map((p) => p.transaction.id));
    }

    function clearSelection() {
        selected = new Set();
    }

    const totalSelected = $derived(
        pending.filter((p) => selected.has(p.transaction.id)).reduce((sum, p) => sum + p.expense.amount, 0)
    );

    async function handleSettle() {
        if (selected.size === 0) {
            toast.error('Select at least one transaction to settle.');
            return;
        }

        isSettling = true;
        try {
            const response = await ofetch('/api/settleVaultReimbursements', {
                method: 'POST',
                body: {
                    vaultId,
                    fundTransactionIds: Array.from(selected),
                },
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.success === false) {
                toast.error(response.error || 'Failed to settle reimbursements');
                return;
            }

            toast.success(`Settled ${response.data.settled} reimbursement(s)`);
            selected = new Set();
            refetchKey++;
        } catch (err: any) {
            toast.error(err?.data?.error || err?.message || 'Failed to settle reimbursements');
        } finally {
            isSettling = false;
        }
    }

    function handleBack() {
        goto(`/vaults/${vaultId}/funds`);
    }
</script>

<svelte:head>
    <title>Vault Reimbursements - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <div class="flex items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold flex-1">Vault Reimbursements</h1>
    </div>

    {#if fundIdParam}
        <div class="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border bg-muted/40 px-3 py-2 text-sm">
            <span class="text-muted-foreground">Showing:</span>
            <span class="font-medium">
                {filteredFundName ?? 'selected fund'}
            </span>
            <button
                type="button"
                onclick={clearFundFilter}
                class="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear fund filter"
            >
                <X class="size-3" />
                Show all funds
            </button>
        </div>
    {/if}

    {#if isLoading}
        <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
    {:else if error}
        <Card class="border-destructive">
            <CardContent class="flex flex-col items-center justify-center py-12">
                <p class="text-destructive mb-4">Failed to load reimbursements.</p>
                <Button variant="outline" onclick={() => refetchKey++}>Retry</Button>
            </CardContent>
        </Card>
    {:else if pending.length === 0}
        <Card>
            <CardContent class="flex flex-col items-center justify-center py-16 text-center">
                <div class="text-4xl mb-4">✅</div>
                <h2 class="text-xl font-semibold mb-2">
                    {fundIdParam ? 'Nothing to settle for this fund' : 'No pending reimbursements'}
                </h2>
                <p class="text-muted-foreground">
                    {#if fundIdParam && allPending.length > 0}
                        Other funds in this vault still have items —
                        <button type="button" class="underline hover:text-foreground" onclick={clearFundFilter}>
                            view all
                        </button>.
                    {:else}
                        All expenses across all funds have been settled.
                    {/if}
                </p>
            </CardContent>
        </Card>
    {:else}
        <!-- Settle bar -->
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onclick={selectAll}>Select All</Button>
            {#if selected.size > 0}
                <Button variant="outline" size="sm" onclick={clearSelection}>Clear</Button>
                <span class="text-sm text-muted-foreground">
                    {selected.size} selected — Total: {totalSelected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <Button onclick={handleSettle} disabled={isSettling} class="ml-auto">
                    {isSettling ? 'Settling...' : 'Settle Selected'}
                </Button>
            {/if}
        </div>

        {#each byFund() as group}
            <div class="mb-6">
                <h2 class="text-sm font-semibold text-muted-foreground mb-2 px-1">{group.fundName}</h2>
                <div class="space-y-2">
                    {#each group.items as item (item.transaction.id)}
                        <button
                            class="w-full text-left"
                            onclick={() => toggleSelect(item.transaction.id)}
                        >
                            <Card class={selected.has(item.transaction.id) ? 'border-primary bg-primary/5' : 'hover:shadow-sm'}>
                                <CardContent class="py-3 px-4 flex items-center gap-3">
                                    <div class="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
                                        {selected.has(item.transaction.id) ? 'bg-primary border-primary' : 'border-muted-foreground'}">
                                        {#if selected.has(item.transaction.id)}
                                            <svg class="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        {/if}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-medium truncate">{item.expense.note || '(no description)'}</p>
                                        <p class="text-xs text-muted-foreground">
                                            {new Date(item.expense.date).toLocaleDateString()}
                                            · {item.expense.categoryName}
                                            · {item.expense.paymentType}
                                            {#if item.expense.paidByName}· {item.expense.paidByName}{/if}
                                        </p>
                                    </div>
                                    <p class="font-semibold shrink-0">
                                        {item.expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </CardContent>
                            </Card>
                        </button>
                    {/each}
                </div>
            </div>
        {/each}
    {/if}
</div>

<Toaster />
