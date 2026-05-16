<script lang="ts" module>
    import type { VaultSwitcherVault } from './VaultSwitcherList.svelte';

    export type MobileAppBarProps = {
        vaults: VaultSwitcherVault[];
        currentVaultId: string | null;
        currentVault: VaultSwitcherVault | null;
        currentPath: string;
        searchParams: string;
    };
</script>

<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import * as Drawer from '$lib/components/ui/drawer';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import InvitationsNotification from '$lib/components/invitations-notification.svelte';
    import { cn } from '$lib/utils';
    import VaultChip from './VaultChip.svelte';
    import VaultSwitcherList from './VaultSwitcherList.svelte';
    import { mapPathToVault } from './preserve-section';
    import MoreVertical from '@lucide/svelte/icons/more-vertical';
    import Settings from '@lucide/svelte/icons/settings';
    import Wallet from '@lucide/svelte/icons/wallet';

    let {
        vaults,
        currentVaultId,
        currentVault,
        currentPath,
        searchParams,
    }: MobileAppBarProps = $props();

    let switcherOpen = $state(false);

    function selectVault(vaultId: string) {
        const path = currentVaultId
            ? mapPathToVault(currentPath, vaultId)
            : `/vaults/${vaultId}`;
        switcherOpen = false;
        goto(path + searchParams);
    }

    // Hide-on-scroll-down, reveal-on-scroll-up.
    let hidden = $state(false);
    let lastY = 0;
    function onScroll() {
        const y = window.scrollY;
        if (y < 8) {
            hidden = false;
        } else if (y > lastY + 4) {
            hidden = true;
        } else if (y < lastY - 4) {
            hidden = false;
        }
        lastY = y;
    }
    onMount(() => {
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    });
</script>

<header
    class={cn(
        'md:hidden sticky top-0 z-40 w-full border-b',
        'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'transition-transform duration-150',
        hidden && '-translate-y-full',
    )}
>
    <div class="flex items-center justify-between gap-2 h-12 px-2">
        <!-- Vault chip / switcher -->
        <Drawer.Root bind:open={switcherOpen}>
            <Drawer.Trigger
                aria-label="Switch vault"
                class="flex-1 min-w-0 flex items-center px-2 py-1 rounded-md hover:bg-accent transition-colors"
            >
                {#if currentVault}
                    <VaultChip
                        name={currentVault.name}
                        icon={currentVault.icon}
                        color={currentVault.color}
                        variant="appbar"
                    />
                {:else}
                    <span class="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wallet class="size-4" />
                        <span>All vaults</span>
                    </span>
                {/if}
            </Drawer.Trigger>
            <Drawer.Content class="flex flex-col max-h-[85dvh]">
                <Drawer.Header class="text-left shrink-0">
                    <Drawer.Title>Switch vault</Drawer.Title>
                </Drawer.Header>
                <div class="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
                    <VaultSwitcherList
                        {vaults}
                        {currentVaultId}
                        onSelect={selectVault}
                        onAllVaults={() => {
                            switcherOpen = false;
                            goto('/vaults');
                        }}
                        onNewVault={() => {
                            switcherOpen = false;
                            goto('/vaults/new');
                        }}
                    />
                </div>
            </Drawer.Content>
        </Drawer.Root>

        <!-- Right-side actions -->
        <div class="flex items-center gap-1 shrink-0">
            <InvitationsNotification />

            <DropdownMenu.Root>
                <DropdownMenu.Trigger
                    aria-label="More actions"
                    class="inline-flex items-center justify-center size-9 rounded-md hover:bg-accent transition-colors"
                >
                    <MoreVertical class="size-5" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" class="min-w-[12rem]">
                    <DropdownMenu.Item onclick={() => goto('/settings')}>
                        <Settings class="size-4" />
                        <span>Settings</span>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    </div>
</header>
