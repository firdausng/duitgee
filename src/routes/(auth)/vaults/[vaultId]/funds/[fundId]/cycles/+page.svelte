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
        createdAt: string;
    };

    const cyclesResource = resource(
        () => [vaultId, fundId, refetchKey] as const,
        async ([vid, fid]) => {
            const response = await ofetch<{ success: boolean; data: { cycles: Cycle[]; historyAllowed: boolean } }>(
                `/api/getFundCycles?vaultId=${vid}&fundId=${fid}`
            );
            return response.data;
        }
    );

    const cycles = $derived(cyclesResource.current?.cycles ?? []);
    const historyAllowed = $derived(cyclesResource.current?.historyAllowed ?? false);
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
</script>

<svelte:head>
    <title>Cycle History - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <div class="mb-1">
        <Button variant="ghost" size="sm" onclick={handleBack} class="-ml-2">← Back</Button>
    </div>
    <h1 class="text-2xl font-bold mb-6">Cycle History</h1>

    {#if cyclesResource.current && !historyAllowed}
        <div class="mb-4 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            Past cycles are hidden on the free plan. Only the active cycle is shown.
        </div>
    {/if}

    {#if isLoading}
        <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
    {:else if error}
        <Card class="border-destructive">
            <CardContent class="flex flex-col items-center justify-center py-12">
                <p class="text-destructive mb-4">Failed to load cycle history.</p>
                <Button variant="outline" onclick={() => refetchKey++}>Retry</Button>
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
                <Card>
                    <CardHeader class="pb-2">
                        <CardTitle class="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            {formatPeriod(cycle.periodStart, cycle.periodEnd)}
                            {#if cycle.status === 'active'}
                                <span class="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">Active</span>
                            {/if}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div class="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p class="text-lg font-semibold">
                                    {(cycle.topUpAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <p class="text-xs text-muted-foreground">Top-ups</p>
                            </div>
                            <div>
                                <p class="text-lg font-semibold">
                                    {(cycle.totalSpent ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <p class="text-xs text-muted-foreground">Expenses</p>
                            </div>
                            <div>
                                <p class="text-lg font-semibold">
                                    {(cycle.totalReimbursed ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <p class="text-xs text-muted-foreground">Reimbursed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            {/each}
        </div>
    {/if}
</div>

<Toaster />
