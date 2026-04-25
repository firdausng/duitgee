<script lang="ts">
    import InvitationsNotification from "$lib/components/invitations-notification.svelte";
    import { authClientBase } from "$lib/client/auth-client-base";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { ofetch } from "ofetch";
    import { resource } from "runed";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import { toggleMode, mode } from "mode-watcher";

    import Menu from "@lucide/svelte/icons/menu";
    import Plus from "@lucide/svelte/icons/plus";
    import Wallet from "@lucide/svelte/icons/wallet";
    import Inbox from "@lucide/svelte/icons/inbox";
    import Settings from "@lucide/svelte/icons/settings";
    import LogOut from "@lucide/svelte/icons/log-out";
    import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
    import Sun from "@lucide/svelte/icons/sun";
    import Moon from "@lucide/svelte/icons/moon";

    let { children, data } = $props();

    let authClient = authClientBase({ basePath: data.basePath });

    // Extract vaultId from URL if viewing a vault page
    const vaultId = $derived(() => {
        const match = page.url.pathname.match(/\/vaults\/([^\/]+)/);
        return match ? match[1] : null;
    });

    // Preserve search params across nav
    const searchParams = $derived(() => page.url.search || '');

    // Pending recurring approvals count — drives the Recurring nav badge.
    const pendingResource = resource(
        () => vaultId(),
        async (id) => {
            if (!id || id === 'new') return 0;
            try {
                const res = await ofetch<{ success: boolean; data: unknown[] }>(
                    `/api/getPendingOccurrences?vaultId=${id}`,
                );
                return (res.data ?? []).length;
            } catch {
                return 0;
            }
        },
    );
    const pendingCount = $derived(pendingResource.current ?? 0);

    function isActive(href: string): boolean {
        return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
    }

    async function signOut() {
        await authClient.signOut();
        await goto('/login');
    }

    let stoppingImpersonation = $state(false);
    async function stopImpersonating() {
        stoppingImpersonation = true;
        try {
            await authClient.admin.stopImpersonating();
            window.location.href = '/ops/users';
        } catch {
            stoppingImpersonation = false;
        }
    }

    // Cap the inline vault list in the dropdown. Longer lists show a "See all" link.
    const VAULT_LIST_CAP = 8;
    const inlineVaults = $derived(data.vaults.slice(0, VAULT_LIST_CAP));
    const hasMoreVaults = $derived(data.vaults.length > VAULT_LIST_CAP);
</script>

<div class="min-h-screen bg-background">
    {#if data.isImpersonating}
        <div class="sticky top-0 z-[60] w-full bg-amber-500/90 text-amber-950 text-sm">
            <div class="container mx-auto flex h-9 max-w-screen-2xl items-center justify-between gap-4 px-4">
                <div class="flex items-center gap-2 min-w-0">
                    <TriangleAlert class="size-4 shrink-0" />
                    <span class="truncate">
                        Impersonating <strong>{data.user?.name || data.user?.email}</strong>
                        {#if data.user?.email && data.user?.name}
                            <span class="opacity-75">({data.user.email})</span>
                        {/if}
                    </span>
                </div>
                <button
                    onclick={stopImpersonating}
                    disabled={stoppingImpersonation}
                    class="shrink-0 rounded-md bg-amber-950 text-amber-50 px-2.5 py-0.5 text-xs font-medium hover:bg-amber-900 disabled:opacity-50"
                >
                    {stoppingImpersonation ? 'Stopping...' : 'Stop'}
                </button>
            </div>
        </div>
    {/if}

    <!-- Header -->
    <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div class="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
            <!-- Logo -->
            <a href="/vaults" class="flex items-center">
                <img src="/favicon.svg" alt="DuitGee Logo" class="h-8 w-8" />
            </a>

            <!-- Vault Navigation Tabs (desktop only; mobile variant below the header) -->
            {#if vaultId() && vaultId() !== 'new'}
                {@const vId = vaultId()}
                {@const tabs = [
                    { href: `/vaults/${vId}`, label: 'Home', exact: true, badge: 0 },
                    { href: `/vaults/${vId}/expenses`, label: 'Expenses', badge: 0 },
                    { href: `/vaults/${vId}/funds`, label: 'Funds', badge: 0 },
                    { href: `/vaults/${vId}/templates`, label: 'Templates', badge: 0 },
                    { href: `/vaults/${vId}/recurring`, label: 'Recurring', badge: pendingCount },
                    { href: `/vaults/${vId}/statistics`, label: 'Statistics', badge: 0 },
                    { href: `/vaults/${vId}/members`, label: 'Members', badge: 0 },
                ]}
                <nav class="hidden md:flex gap-1 flex-1 pl-2 overflow-x-auto">
                    {#each tabs as tab}
                        {@const active = tab.exact ? page.url.pathname === tab.href : isActive(tab.href)}
                        <a
                            href="{tab.href}{searchParams()}"
                            class="relative py-2 px-3 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap inline-flex items-center gap-1.5 {active ? 'text-primary' : 'text-muted-foreground'}"
                        >
                            {tab.label}
                            {#if tab.badge > 0}
                                <span class="inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                                    {tab.badge}
                                </span>
                            {/if}
                            {#if active}
                                <div class="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"></div>
                            {/if}
                        </a>
                    {/each}
                </nav>
            {/if}

            <!-- Actions -->
            <div class="flex items-center gap-2">
                <InvitationsNotification />

                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        aria-label="Open menu"
                        title="Menu"
                        class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-2"
                    >
                        <Menu class="size-5" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" class="min-w-[16rem]">
                        <!-- User label (non-interactive) -->
                        {#if data.user}
                            <div class="flex items-center gap-3 px-2 py-2 mb-1">
                                <div class="size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0">
                                    {data.user.name?.charAt(0)?.toUpperCase() || data.user.email?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium truncate">{data.user.name || 'User'}</p>
                                    <p class="text-xs text-muted-foreground truncate">{data.user.email}</p>
                                </div>
                            </div>
                            <DropdownMenu.Separator />
                        {/if}

                        <!-- Vaults switcher -->
                        <DropdownMenu.Item onclick={() => goto('/vaults')}>
                            <Wallet class="size-3.5" />
                            <span>All vaults</span>
                        </DropdownMenu.Item>
                        {#each inlineVaults as vaultItem}
                            <DropdownMenu.Item onclick={() => goto(`/vaults/${vaultItem.vaults.id}${searchParams()}`)}>
                                <span
                                    class="inline-flex items-center justify-center size-5 rounded-full text-sm shrink-0"
                                    style="background-color: {vaultItem.vaults.color || '#3B82F6'}"
                                >
                                    {vaultItem.vaults.icon || '🏦'}
                                </span>
                                <span class="truncate">{vaultItem.vaults.name}</span>
                                {#if vaultId() === vaultItem.vaults.id}
                                    <span class="ml-auto text-xs text-muted-foreground">current</span>
                                {/if}
                            </DropdownMenu.Item>
                        {/each}
                        {#if hasMoreVaults}
                            <DropdownMenu.Item onclick={() => goto('/vaults')}>
                                <span class="size-3.5"></span>
                                <span class="text-muted-foreground">See all {data.vaults.length} vaults…</span>
                            </DropdownMenu.Item>
                        {/if}
                        <DropdownMenu.Item onclick={() => goto('/vaults/new')}>
                            <Plus class="size-3.5" />
                            <span>New vault</span>
                        </DropdownMenu.Item>

                        <DropdownMenu.Separator />

                        <!-- Account / utilities -->
                        <DropdownMenu.Item onclick={() => goto('/invitations')}>
                            <Inbox class="size-3.5" />
                            <span>Invitations</span>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onclick={() => goto('/settings')}>
                            <Settings class="size-3.5" />
                            <span>Settings</span>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            onSelect={(e: Event) => {
                                e.preventDefault();
                                toggleMode();
                            }}
                        >
                            {#if mode.current === 'dark'}
                                <Sun class="size-3.5" />
                                <span>Light mode</span>
                            {:else}
                                <Moon class="size-3.5" />
                                <span>Dark mode</span>
                            {/if}
                        </DropdownMenu.Item>

                        <DropdownMenu.Separator />

                        <DropdownMenu.Item destructive onclick={signOut}>
                            <LogOut class="size-3.5" />
                            <span>Logout</span>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>
        </div>

        <!-- Mobile vault tab row (same tabs as desktop, horizontally scrollable) -->
        {#if vaultId() && vaultId() !== 'new'}
            {@const vId = vaultId()}
            {@const mobileTabs = [
                { href: `/vaults/${vId}`, label: 'Home', exact: true, badge: 0 },
                { href: `/vaults/${vId}/expenses`, label: 'Expenses', badge: 0 },
                { href: `/vaults/${vId}/funds`, label: 'Funds', badge: 0 },
                { href: `/vaults/${vId}/templates`, label: 'Templates', badge: 0 },
                { href: `/vaults/${vId}/recurring`, label: 'Recurring', badge: pendingCount },
                { href: `/vaults/${vId}/statistics`, label: 'Statistics', badge: 0 },
                { href: `/vaults/${vId}/members`, label: 'Members', badge: 0 },
            ]}
            <nav
                class="md:hidden flex gap-1 overflow-x-auto border-t bg-background px-2 py-1 scrollbar-hide"
                aria-label="Vault sections"
            >
                {#each mobileTabs as tab}
                    {@const active = tab.exact ? page.url.pathname === tab.href : isActive(tab.href)}
                    <a
                        href="{tab.href}{searchParams()}"
                        class="relative shrink-0 py-1.5 px-3 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap inline-flex items-center gap-1.5 {active ? 'text-primary' : 'text-muted-foreground'}"
                    >
                        {tab.label}
                        {#if tab.badge > 0}
                            <span class="inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                                {tab.badge}
                            </span>
                        {/if}
                        {#if active}
                            <div class="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"></div>
                        {/if}
                    </a>
                {/each}
            </nav>
        {/if}
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-x-hidden overflow-y-auto bg-background">
        {@render children?.()}
    </main>
</div>
