<script lang="ts" module>
    export type MobileMoreSheetProps = {
        open: boolean;
        currentVaultId: string | null;
        linkVaultId: string | null;
        currentPath: string;
        searchParams: string;
        badges?: Partial<Record<'pendingRecurring', number>>;
        onOpenChange: (open: boolean) => void;
    };
</script>

<script lang="ts">
    import { goto } from '$app/navigation';
    import * as Drawer from '$lib/components/ui/drawer';
    import { MOBILE_MORE_ITEMS, vaultItemHref } from './nav-config';
    import Settings from '@lucide/svelte/icons/settings';
    import Pencil from '@lucide/svelte/icons/pencil';

    let {
        open,
        currentVaultId,
        linkVaultId,
        currentPath: _currentPath,
        searchParams,
        badges = {},
        onOpenChange,
    }: MobileMoreSheetProps = $props();

    function navigate(href: string) {
        onOpenChange(false);
        goto(href);
    }
</script>

<Drawer.Root {open} onOpenChange={onOpenChange}>
    <Drawer.Content class="px-2 pb-6 max-h-[80vh]">
        <Drawer.Header class="text-left">
            <Drawer.Title>More</Drawer.Title>
        </Drawer.Header>

        <nav class="px-2">
            <ul class="space-y-0.5">
                {#each MOBILE_MORE_ITEMS as item (item.id)}
                    {@const Icon = item.icon}
                    {@const disabled = !linkVaultId}
                    {@const href = linkVaultId
                        ? vaultItemHref(linkVaultId, item, searchParams)
                        : '#'}
                    {@const badgeValue = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0}
                    <li>
                        <button
                            type="button"
                            disabled={disabled}
                            onclick={() => navigate(href)}
                            class="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium hover:bg-accent transition-colors text-left disabled:opacity-40 disabled:pointer-events-none"
                        >
                            <Icon class="size-5 text-muted-foreground shrink-0" />
                            <span class="flex-1 truncate">{item.label}</span>
                            {#if badgeValue > 0}
                                <span
                                    class="inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold"
                                >
                                    {badgeValue}
                                </span>
                            {/if}
                        </button>
                    </li>
                {/each}
            </ul>

            {#if linkVaultId}
                <div class="-mx-2 my-2 h-px bg-border"></div>
                <ul class="space-y-0.5">
                    <li>
                        <button
                            type="button"
                            onclick={() => navigate(`/vaults/${linkVaultId}/edit`)}
                            class="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium hover:bg-accent transition-colors text-left"
                        >
                            <Pencil class="size-5 text-muted-foreground shrink-0" />
                            <span class="flex-1 truncate">Vault settings</span>
                        </button>
                    </li>
                </ul>
            {/if}

            <div class="-mx-2 my-2 h-px bg-border"></div>
            <ul class="space-y-0.5">
                <li>
                    <button
                        type="button"
                        onclick={() => navigate('/settings')}
                        class="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium hover:bg-accent transition-colors text-left"
                    >
                        <Settings class="size-5 text-muted-foreground shrink-0" />
                        <span class="flex-1 truncate">Account settings</span>
                    </button>
                </li>
            </ul>
        </nav>
    </Drawer.Content>
</Drawer.Root>
