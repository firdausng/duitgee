<script lang="ts" module>
    import type { VaultSwitcherVault } from './VaultSwitcherList.svelte';

    export type SidebarBadges = Partial<Record<'pendingRecurring', number>>;

    export type SidebarProps = {
        vaults: VaultSwitcherVault[];
        currentVaultId: string | null;
        /** Vault to link nav items at when the user is outside a vault (e.g. on /settings). Falls back to currentVaultId. */
        linkVaultId: string | null;
        currentVault: VaultSwitcherVault | null;
        currentPath: string;
        searchParams: string;
        badges?: SidebarBadges;
        user: { name?: string | null; email?: string | null; image?: string | null } | null;
        onLogout: () => void;
    };
</script>

<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { cn } from '$lib/utils';
    import VaultChip from './VaultChip.svelte';
    import VaultSwitcherList from './VaultSwitcherList.svelte';
    import UserMenu from './UserMenu.svelte';
    import { sidebarState } from './sidebar-state.svelte';
    import { mapPathToVault } from './preserve-section';
    import { VAULT_NAV, vaultItemHref, isItemActive } from './nav-config';
    import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
    import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
    import Wallet from '@lucide/svelte/icons/wallet';

    let {
        vaults,
        currentVaultId,
        linkVaultId,
        currentVault,
        currentPath,
        searchParams,
        badges = {},
        user,
        onLogout,
    }: SidebarProps = $props();

    const collapsed = $derived(sidebarState.collapsed);
    const widthClass = $derived(collapsed ? 'w-16' : 'w-60');

    function selectVault(vaultId: string) {
        const path = currentVaultId
            ? mapPathToVault(currentPath, vaultId)
            : `/vaults/${vaultId}`;
        goto(path + searchParams);
    }

    // cmd/ctrl+B toggles the sidebar collapse. Skip when the user is typing.
    function isTypingTarget(target: EventTarget | null): boolean {
        if (!(target instanceof HTMLElement)) return false;
        const tag = target.tagName;
        return (
            tag === 'INPUT' ||
            tag === 'TEXTAREA' ||
            tag === 'SELECT' ||
            target.isContentEditable
        );
    }
    function onKeydown(event: KeyboardEvent) {
        if (event.key !== 'b' && event.key !== 'B') return;
        if (!(event.metaKey || event.ctrlKey)) return;
        if (event.altKey || event.shiftKey) return;
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        sidebarState.toggle();
    }
    onMount(() => {
        window.addEventListener('keydown', onKeydown);
        return () => window.removeEventListener('keydown', onKeydown);
    });
</script>

<aside
    class={cn(
        'hidden md:flex flex-col shrink-0 border-r bg-background sticky top-0 self-start h-screen',
        'transition-[width] duration-150',
        widthClass,
    )}
    aria-label="Primary navigation"
>
    <!-- Brand + collapse toggle -->
    <div
        class={cn(
            'flex items-center h-14 px-3 border-b shrink-0',
            collapsed ? 'justify-center' : 'justify-between',
        )}
    >
        {#if !collapsed}
            <a href="/vaults" class="flex items-center gap-2 min-w-0">
                <img src="/favicon.svg" alt="" class="size-6" />
                <span class="font-semibold text-sm">DuitGee</span>
            </a>
        {/if}
        <button
            type="button"
            onclick={() => sidebarState.toggle()}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
            class="inline-flex items-center justify-center size-8 rounded-md hover:bg-accent transition-colors text-muted-foreground"
        >
            {#if collapsed}
                <PanelLeftOpen class="size-4" />
            {:else}
                <PanelLeftClose class="size-4" />
            {/if}
        </button>
    </div>

    <!-- Vault chip / switcher -->
    <div class={cn('px-2 pt-3', collapsed && 'flex justify-center')}>
        <DropdownMenu.Root>
            <DropdownMenu.Trigger
                aria-label="Switch vault"
                title={currentVault?.name ?? 'Select vault'}
                class={cn(
                    'rounded-md hover:bg-accent transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    collapsed ? 'size-10 inline-flex items-center justify-center' : 'w-full px-2 py-1.5',
                )}
            >
                {#if currentVault}
                    <VaultChip
                        name={currentVault.name}
                        icon={currentVault.icon}
                        color={currentVault.color}
                        variant={collapsed ? 'sidebar-collapsed' : 'sidebar'}
                        showChevron={!collapsed}
                    />
                {:else if collapsed}
                    <Wallet class="size-4 text-muted-foreground" />
                {:else}
                    <span class="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wallet class="size-4" />
                        <span>Select vault</span>
                    </span>
                {/if}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align={collapsed ? 'start' : 'start'} side="bottom" class="min-w-[16rem]">
                <VaultSwitcherList
                    {vaults}
                    {currentVaultId}
                    onSelect={selectVault}
                    onAllVaults={() => goto('/vaults')}
                    onNewVault={() => goto('/vaults/new')}
                />
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </div>

    <!-- Nav sections -->
    <nav class={cn('flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')}>
        {#each VAULT_NAV as section (section.id)}
            <div class={cn(section.id !== 'primary' && 'mt-4')}>
                {#if !collapsed && section.label}
                    <p class="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {section.label}
                    </p>
                {/if}
                <ul class="space-y-0.5">
                    {#each section.items as item (item.id)}
                        {@const Icon = item.icon}
                        {@const active = currentVaultId
                            ? isItemActive(currentPath, currentVaultId, item)
                            : false}
                        {@const disabled = !linkVaultId}
                        {@const href = linkVaultId
                            ? vaultItemHref(linkVaultId, item, searchParams)
                            : '#'}
                        {@const badgeValue = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0}
                        <li>
                            <a
                                href={disabled ? undefined : href}
                                aria-current={active ? 'page' : undefined}
                                aria-disabled={disabled || undefined}
                                title={collapsed ? item.label : undefined}
                                class={cn(
                                    'group flex items-center gap-3 rounded-md text-sm font-medium transition-colors',
                                    collapsed
                                        ? 'justify-center size-10 mx-auto'
                                        : 'px-2 py-1.5',
                                    active
                                        ? 'bg-accent text-accent-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                                    disabled && 'opacity-40 pointer-events-none',
                                )}
                            >
                                <Icon class="size-4 shrink-0" />
                                {#if !collapsed}
                                    <span class="flex-1 truncate">{item.label}</span>
                                    {#if badgeValue > 0}
                                        <span
                                            class="inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold"
                                        >
                                            {badgeValue}
                                        </span>
                                    {/if}
                                {:else if badgeValue > 0}
                                    <span
                                        class="absolute size-2 rounded-full bg-primary translate-x-3 -translate-y-3"
                                        aria-hidden="true"
                                    ></span>
                                {/if}
                            </a>
                        </li>
                    {/each}
                </ul>
            </div>
        {/each}
    </nav>

    <!-- Settings + user -->
    <div class={cn('border-t p-2 space-y-1 shrink-0', collapsed && 'px-2')}>
        {#if !collapsed}
            <UserMenu {user} onSettings={() => goto('/settings')} {onLogout} />
        {:else}
            <button
                type="button"
                onclick={() => goto('/settings')}
                aria-label="Account & settings"
                title={user?.name || user?.email || 'Account'}
                class="size-10 mx-auto flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
                {(user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
            </button>
        {/if}
    </div>
</aside>
