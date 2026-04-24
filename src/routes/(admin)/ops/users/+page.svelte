<script lang="ts">
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent } from '$lib/components/ui/card';
    import Search from '@lucide/svelte/icons/search';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import LogIn from '@lucide/svelte/icons/log-in';
    import Loader2 from '@lucide/svelte/icons/loader-2';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { authClientBase } from '$lib/client/auth-client-base';

    let { data } = $props();

    let searchInput = $state(data.query);
    let impersonatingId = $state<string | null>(null);
    let impersonateError = $state<string | null>(null);

    const authClient = $derived(authClientBase({ basePath: page.url.origin }));

    async function impersonate(userId: string) {
        impersonatingId = userId;
        impersonateError = null;
        try {
            await authClient.admin.impersonateUser({ userId });
            window.location.href = '/vaults';
        } catch (err) {
            impersonateError = err instanceof Error ? err.message : 'Failed to impersonate';
            impersonatingId = null;
        }
    }

    function runSearch(e: SubmitEvent) {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchInput) params.set('q', searchInput);
        goto(`/ops/users?${params.toString()}`);
    }

    function gotoPage(p: number) {
        const params = new URLSearchParams(page.url.searchParams);
        params.set('page', String(p));
        goto(`/ops/users?${params.toString()}`);
    }

    function formatDate(ms: Date | number) {
        const d = ms instanceof Date ? ms : new Date(ms);
        return d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    function initials(name: string | null | undefined, email: string) {
        const src = name ?? email;
        return src.slice(0, 2).toUpperCase();
    }
</script>

<div class="space-y-4">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-semibold">Users</h1>
            <p class="text-sm text-muted-foreground">
                {data.pagination.total.toLocaleString()} total
            </p>
        </div>
        <form onsubmit={runSearch} class="flex items-center gap-2">
            <div class="relative">
                <Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search email or name..."
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
                            <th class="px-4 py-2 font-medium">Name</th>
                            <th class="px-4 py-2 font-medium hidden md:table-cell">Email</th>
                            <th class="px-4 py-2 font-medium">Role</th>
                            <th class="px-4 py-2 font-medium">Flags</th>
                            <th class="px-4 py-2 font-medium text-right">Created</th>
                            <th class="px-4 py-2 font-medium text-right"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each data.users as user (user.id)}
                            <tr class="border-b last:border-0 hover:bg-muted/30">
                                <td class="px-4 py-2">
                                    <div class="flex items-center gap-3">
                                        {#if user.image}
                                            <img
                                                src={user.image}
                                                alt=""
                                                class="size-8 rounded-full object-cover"
                                            />
                                        {:else}
                                            <div class="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                                {initials(user.name, user.email)}
                                            </div>
                                        {/if}
                                        <div class="min-w-0">
                                            <div class="font-medium truncate">{user.name || '—'}</div>
                                            <div class="text-xs text-muted-foreground truncate md:hidden">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-4 py-2 hidden md:table-cell">
                                    <div class="flex items-center gap-1.5">
                                        <span class="truncate">{user.email}</span>
                                        {#if !user.emailVerified}
                                            <span class="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">unverified</span>
                                        {/if}
                                    </div>
                                </td>
                                <td class="px-4 py-2">
                                    {#if user.role === 'admin'}
                                        <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">admin</span>
                                    {:else}
                                        <span class="text-xs text-muted-foreground">user</span>
                                    {/if}
                                </td>
                                <td class="px-4 py-2">
                                    <div class="flex gap-1 flex-wrap">
                                        {#if user.isAnonymous}
                                            <span class="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">anonymous</span>
                                        {/if}
                                        {#if user.banned}
                                            <span class="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">banned</span>
                                        {/if}
                                    </div>
                                </td>
                                <td class="px-4 py-2 text-right text-muted-foreground text-xs whitespace-nowrap">
                                    {formatDate(user.createdAt)}
                                </td>
                                <td class="px-4 py-2 text-right">
                                    {#if user.id !== data.currentUserId && user.role !== 'admin' && !user.banned}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={impersonatingId !== null}
                                            onclick={() => impersonate(user.id)}
                                        >
                                            {#if impersonatingId === user.id}
                                                <Loader2 class="size-3.5 animate-spin" />
                                            {:else}
                                                <LogIn class="size-3.5" />
                                            {/if}
                                            Impersonate
                                        </Button>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                        {#if data.users.length === 0}
                            <tr>
                                <td colspan="6" class="px-4 py-10 text-center text-muted-foreground">
                                    No users match.
                                </td>
                            </tr>
                        {/if}
                    </tbody>
                </table>
            </div>
        </CardContent>
    </Card>

    {#if impersonateError}
        <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {impersonateError}
        </div>
    {/if}

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
