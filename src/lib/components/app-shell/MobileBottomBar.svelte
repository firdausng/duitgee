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
        /** Optional callback for the "Quick log" entry inside the quick-add sheet. */
        onQuickLog?: () => void;
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
    import { shallowModal } from '$lib/utils/shallow-modal.svelte';

    let {
        currentVaultId,
        linkVaultId,
        currentPath,
        searchParams,
        badges = {},
        quickAdd,
        onQuickLog,
    }: MobileBottomBarProps = $props();

    // Shallow-routed sheets — back button (and swipe-down / tap-outside) closes
    // the sheet first instead of navigating to the previous page.
    const moreSheet = shallowModal('mobileMore');
    const quickAddSheet = shallowModal('quickAdd');

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
    class="dg-mbb md:hidden fixed bottom-0 inset-x-0 z-40"
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
                    'dg-mbb__item',
                    active && 'is-active',
                    disabled && 'opacity-40 pointer-events-none',
                )}
            >
                <Icon class="size-5" />
                <span class="dg-mbb__label">{item.label}</span>
                {#if badgeValue > 0}
                    <span class="dg-mbb__badge">{badgeValue}</span>
                {/if}
            </a>
        {/each}

        <!-- Center Quick Add — oxblood square FAB -->
        <div class="flex items-center justify-center">
            <button
                type="button"
                aria-label="Add expense"
                disabled={!quickAdd}
                onclick={() => quickAddSheet.push()}
                class="dg-mbb__fab"
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
                    'dg-mbb__item',
                    active && 'is-active',
                    disabled && 'opacity-40 pointer-events-none',
                )}
            >
                <Icon class="size-5" />
                <span class="dg-mbb__label">{item.label}</span>
                {#if badgeValue > 0}
                    <span class="dg-mbb__badge">{badgeValue}</span>
                {/if}
            </a>
        {/each}

        <!-- More button -->
        <button
            type="button"
            onclick={() => moreSheet.push()}
            aria-label="More sections"
            class={cn('dg-mbb__item dg-mbb__more', moreActive && 'is-active')}
        >
            <MenuIcon class="size-5" />
            <span class="dg-mbb__label">More</span>
        </button>
    </div>
</nav>

<style>
    /* Almanac mobile bottom bar — paper-2 surface, hairline ink top, mono labels */
    .dg-mbb {
        background: var(--almanac-paper-2);
        border-top: 1px solid var(--almanac-ink);
    }
    .dg-mbb__item {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.2rem;
        color: var(--almanac-ink-3);
        background: none;
        border: none;
        font-family: 'JetBrains Mono', monospace;
        cursor: pointer;
        text-decoration: none;
        transition: color 150ms;
    }
    .dg-mbb__item:hover { color: var(--almanac-ink); }
    .dg-mbb__item.is-active { color: var(--almanac-oxblood); }
    .dg-mbb__label {
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-weight: 500;
    }
    .dg-mbb__item.is-active .dg-mbb__label {
        font-family: 'Fraunces', serif;
        font-style: italic;
        font-variation-settings: 'opsz' 24, 'SOFT' 80, 'wght' 460;
        text-transform: none;
        letter-spacing: -0.005em;
        font-size: 0.78rem;
    }

    .dg-mbb__badge {
        position: absolute;
        top: 0.4rem;
        right: calc(50% - 1.2rem);
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.55rem;
        font-weight: 600;
        background: var(--almanac-oxblood);
        color: var(--almanac-paper);
        padding: 0 0.3rem;
        min-width: 0.95rem;
        height: 0.85rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        letter-spacing: 0;
    }

    .dg-mbb__fab {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        background: var(--almanac-oxblood);
        color: var(--almanac-paper);
        border: 1px solid var(--almanac-oxblood);
        cursor: pointer;
        margin-top: -0.5rem;
        transition: opacity 150ms;
    }
    .dg-mbb__fab:hover { opacity: 0.92; }
    .dg-mbb__fab:disabled { opacity: 0.3; pointer-events: none; }
</style>

<MobileMoreSheet
    open={moreSheet.open}
    onOpenChange={(o) => moreSheet.bind(o)}
    {currentVaultId}
    {linkVaultId}
    {currentPath}
    {searchParams}
    {badges}
/>

{#if quickAdd}
    <QuickAddSheet
        open={quickAddSheet.open}
        onOpenChange={(o) => quickAddSheet.bind(o)}
        templates={quickAdd.templates}
        resolveTemplateHref={quickAdd.resolveTemplateHref}
        scratchHref={quickAdd.scratchHref}
        browseHref={quickAdd.browseHref}
        {onQuickLog}
    />
{/if}
