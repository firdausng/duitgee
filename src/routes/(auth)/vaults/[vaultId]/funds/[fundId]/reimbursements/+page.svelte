<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';

    let { vaultId, fundId } = page.params;

    let refetchKey = $state(0);
    let selected = $state<Set<string>>(new Set());
    let isSettling = $state(false);

    type PendingRow = {
        transaction: { id: string; fundId: string; expenseId: string | null };
        expense: { id: string; note: string | null; amount: number; date: string; categoryName: string; paymentType: string; paidByName: string | null };
    };

    const pendingResource = resource(
        () => [vaultId, fundId, refetchKey] as const,
        async ([vid, fid]) => {
            const response = await ofetch<{ success: boolean; data: { fund: any; pendingReimbursements: PendingRow[] } }>(
                `/api/getPendingReimbursements?vaultId=${vid}&fundId=${fid}`
            );
            return response.data;
        }
    );

    const fund = $derived(pendingResource.current?.fund ?? null);
    const pending = $derived(pendingResource.current?.pendingReimbursements ?? []);
    const isLoading = $derived(pendingResource.loading);
    const error = $derived(pendingResource.error);

    $effect(() => {
        if (error) toast.error('Failed to load pending reimbursements.');
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
            const response = await ofetch('/api/settleReimbursements', {
                method: 'POST',
                body: {
                    fundId,
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
        goto(`/vaults/${vaultId}/funds/${fundId}`);
    }
</script>

<svelte:head>
    <title>Pending Reimbursements - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <div class="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onclick={handleBack}>← Back</Button>
        <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold">Pending Reimbursements</h1>
            {#if fund}
                <p class="text-sm text-muted-foreground">{fund.name} — Balance: {fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            {/if}
        </div>
    </div>

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
                <h2 class="text-xl font-semibold mb-2">No pending reimbursements</h2>
                <p class="text-muted-foreground">All expenses have been settled.</p>
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

        <div class="space-y-2">
            {#each pending as item (item.transaction.id)}
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
    {/if}
</div>

<Toaster />
