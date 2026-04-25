<script lang="ts" module>
    import type { ExpandableFabTemplate } from '$lib/components/ui/expandable-fab';

    export type MobileBottomBarProps = {
        currentVaultId: string | null;
        /** Vault to link nav items at when outside a vault (e.g. /settings). Falls back to currentVaultId. */
        linkVaultId: string | null;
        currentPath: string;
        searchParams: string;
        badges?: Partial<Record<'pendingRecurring', number>>;
        /** Quick-add data — only meaningful when in a vault. */
        quickAdd: {
            templates: ExpandableFabTemplate[];
            resolveTemplateHref: (templateId: string) => string;
            scratchHref: string;
            browseHref: string;
        } | null;
    };
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import {
        MOBILE_BOTTOM_PRIMARY,
        MOBILE_MORE_ITEMS,
        vaultItemHref,
        isItemActive,
    } from './nav-config';
    import MobileMoreSheet from './MobileMoreSheet.svelte';
    import QuickAddSheet from './QuickAddSheet.svelte';
    import Plus from '@lucide/svelte/icons/plus';
    import MenuIcon from '@lucide/svelte/icons/menu';

    let {
        currentVaultId,
        linkVaultId,
        currentPath,
        searchParams,
        badges = {},
        quickAdd,
    }: MobileBottomBarProps = $props();

    let moreOpen = $state(false);
    let quickAddOpen = $state(false);

    // Splits the 4 nav slots: 2 left of the centered ⊕, 2 right.
    const leftItems = $derived(MOBILE_BOTTOM_PRIMARY.slice(0, 2));
    const rightItems = $derived(MOBILE_BOTTOM_PRIMARY.slice(2));

    // Active if any "more" destination is in the current URL.
    const moreActive = $derived(
        currentVaultId
            ? MOBILE_MORE_ITEMS.some((item) =>
                  isItemActive(currentPath, currentVaultId as string, item),
              )
            : false,
    );
</script>

<nav
    class="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    style="padding-bottom: env(safe-area-inset-bottom);"
    aria-label="Vault sections"
>
    <div class="grid grid-cols-5 h-16">
        {#each leftItems as item (item.id)}
            {@const Icon = item.icon}
            {@const active = currentVaultId
                ? isItemActive(currentPath, currentVaultId, item)
                : false}
            {@const disabled = !linkVaultId}
            {@const href = linkVaultId
                ? vaultItemHref(linkVaultId, item, searchParams)
                : '#'}
            {@const badgeValue = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0}
            <a
                href={disabled ? undefined : href}
                aria-current={active ? 'page' : undefined}
                aria-disabled={disabled || undefined}
                class={cn(
                    'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors relative',
                    active ? 'text-primary' : 'text-muted-foreground',
                    disabled && 'opacity-40 pointer-events-none',
                )}
            >
                <Icon class={cn('size-5', active && 'fill-primary/10')} />
                <span>{item.label}</span>
                {#if badgeValue > 0}
                    <span
                        class="absolute top-1.5 right-[calc(50%-1.25rem)] inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold"
                    >
                        {badgeValue}
                    </span>
                {/if}
            </a>
        {/each}

        <!-- Center Quick Add -->
        <div class="flex items-center justify-center">
            <button
                type="button"
                aria-label="Add expense"
                disabled={!quickAdd}
                onclick={() => (quickAddOpen = true)}
                class={cn(
                    'inline-flex items-center justify-center size-12 rounded-full',
                    'bg-primary text-primary-foreground shadow-md',
                    'transition-all hover:scale-105 active:scale-95',
                    'disabled:opacity-30 disabled:pointer-events-none',
                )}
            >
                <Plus class="size-6" />
            </button>
        </div>

        {#each rightItems as item (item.id)}
            {@const Icon = item.icon}
            {@const active = currentVaultId
                ? isItemActive(currentPath, currentVaultId, item)
                : false}
            {@const disabled = !linkVaultId}
            {@const href = linkVaultId
                ? vaultItemHref(linkVaultId, item, searchParams)
                : '#'}
            {@const badgeValue = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0}
            <a
                href={disabled ? undefined : href}
                aria-current={active ? 'page' : undefined}
                aria-disabled={disabled || undefined}
                class={cn(
                    'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors relative',
                    active ? 'text-primary' : 'text-muted-foreground',
                    disabled && 'opacity-40 pointer-events-none',
                )}
            >
                <Icon class={cn('size-5', active && 'fill-primary/10')} />
                <span>{item.label}</span>
                {#if badgeValue > 0}
                    <span
                        class="absolute top-1.5 right-[calc(50%-1.25rem)] inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold"
                    >
                        {badgeValue}
                    </span>
                {/if}
            </a>
        {/each}

        <!-- More button -->
        <button
            type="button"
            onclick={() => (moreOpen = true)}
            aria-label="More sections"
            class={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                moreActive ? 'text-primary' : 'text-muted-foreground',
            )}
        >
            <MenuIcon class="size-5" />
            <span>More</span>
        </button>
    </div>
</nav>

<MobileMoreSheet
    open={moreOpen}
    onOpenChange={(o) => (moreOpen = o)}
    {currentVaultId}
    {linkVaultId}
    {currentPath}
    {searchParams}
    {badges}
/>

{#if quickAdd}
    <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={(o) => (quickAddOpen = o)}
        templates={quickAdd.templates}
        resolveTemplateHref={quickAdd.resolveTemplateHref}
        scratchHref={quickAdd.scratchHref}
        browseHref={quickAdd.browseHref}
    />
{/if}
