<script lang="ts">
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent } from '$lib/components/ui/card';
    import Search from '@lucide/svelte/icons/search';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import Crown from '@lucide/svelte/icons/crown';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';

    let { data } = $props();

    let searchInput = $state(data.query);

    function runSearch(e: SubmitEvent) {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchInput) params.set('q', searchInput);
        goto(`/ops/vaults?${params.toString()}`);
    }

    function gotoPage(p: number) {
        const params = new URLSearchParams(page.url.searchParams);
        params.set('page', String(p));
        goto(`/ops/vaults?${params.toString()}`);
    }

    function formatDate(iso: string | null) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    function planLabel(planId: string) {
        if (planId === 'plan_pro') return 'Pro';
        if (planId === 'plan_free') return 'Free';
        return planId.replace(/^plan_/, '');
    }
</script>

<div class="space-y-4">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-semibold">Vaults</h1>
            <p class="text-sm text-muted-foreground">
                {data.pagination.total.toLocaleString()} total
            </p>
        </div>
        <form onsubmit={runSearch} class="flex items-center gap-2">
            <div class="relative">
                <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search vault name..."
                    bind:value={searchInput}
                    class="pl-8 w-64"
                />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
        </form>
    </div>

    <Card>
        <CardContent class="p-0">
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="border-b bg-muted/40">
                        <tr class="text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <th class="px-4 py-2 font-medium">Vault</th>
                            <th class="px-4 py-2 font-medium">Plan</th>
                            <th class="px-4 py-2 font-medium hidden md:table-cell">Currency</th>
                            <th class="px-4 py-2 font-medium text-right">Members</th>
                            <th class="px-4 py-2 font-medium text-right">Funds</th>
                            <th class="px-4 py-2 font-medium text-right">Expenses</th>
                            <th class="px-4 py-2 font-medium text-right">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.vaults as vault (vault.id)}
                            <tr class="border-b last:border-0 hover:bg-muted/30">
                                <td class="px-4 py-2">
                                    <div class="flex items-center gap-2">
                                        <span class="text-lg">{vault.icon ?? '🏦'}</span>
                                        <div class="min-w-0">
                                            <div class="font-medium truncate">{vault.name}</div>
                                            <div class="text-xs text-muted-foreground font-mono truncate">{vault.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-4 py-2">
                                    {#if vault.planId === 'plan_pro'}
                                        <span class="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                                            <Crown class="size-3" /> Pro
                                        </span>
                                    {:else}
                                        <span class="text-xs text-muted-foreground">{planLabel(vault.planId)}</span>
                                    {/if}
                                </td>
                                <td class="px-4 py-2 hidden md:table-cell text-muted-foreground text-xs">
                                    {vault.currency ?? '—'}
                                </td>
                                <td class="px-4 py-2 text-right font-mono text-xs">{vault.memberCount}</td>
                                <td class="px-4 py-2 text-right font-mono text-xs">{vault.fundCount}</td>
                                <td class="px-4 py-2 text-right font-mono text-xs">{vault.expenseCount}</td>
                                <td class="px-4 py-2 text-right text-muted-foreground text-xs whitespace-nowrap">
                                    {formatDate(vault.createdAt)}
                                </td>
                            </tr>
                        {/each}
                        {#if data.vaults.length === 0}
                            <tr>
                                <td colspan="7" class="px-4 py-10 text-center text-muted-foreground">
                                    No vaults match.
                                </td>
                            </tr>
                        {/if}
                    </tbody>
                </table>
            </div>
        </CardContent>
    </Card>

    {#if data.pagination.totalPages > 1}
        <div class="flex items-center justify-between">
            <p class="text-xs text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div class="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={data.pagination.page <= 1}
                    onclick={() => gotoPage(data.pagination.page - 1)}
                >
                    <ChevronLeft class="size-4" /> Prev
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={data.pagination.page >= data.pagination.totalPages}
                    onclick={() => gotoPage(data.pagination.page + 1)}
                >
                    Next <ChevronRight class="size-4" />
                </Button>
            </div>
        </div>
    {/if}
</div>
