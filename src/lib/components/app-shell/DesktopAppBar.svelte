<script lang="ts" module>
    import type { Snippet } from 'svelte';

    export type DesktopAppBarVault = {
        id: string;
        name: string;
        icon?: string | null;
        iconType?: string | null;
        /** Whether the current user has this vault marked as their default. */
        isDefault?: boolean;
    };

    export type DesktopAppBarProps = {
        /** Current vault — used for the title chip + scoping the action links. */
        vault: DesktopAppBarVault | null;
        /** Slot for additional left-side content (e.g. breadcrumbs in future). */
        leftSlot?: Snippet;
        /** Slot for the right-side primary action (typically <AddExpenseMenu>). */
        trailing?: Snippet;
        /** Set this vault as the user's default. If omitted, the star is hidden. */
        onSetDefault?: () => void;
    };
</script>

<script lang="ts">
    import { IconRenderer } from '$lib/components/ui/icon-renderer';
    import Star from '@lucide/svelte/icons/star';
    import UserPlus from '@lucide/svelte/icons/user-plus';
    import Settings from '@lucide/svelte/icons/settings';
    import { cn } from '$lib/utils';

    let { vault, leftSlot, trailing, onSetDefault }: DesktopAppBarProps = $props();

    const inviteHref = $derived(vault ? `/vaults/${vault.id}/members` : '#');
    const editHref = $derived(vault ? `/vaults/${vault.id}/edit` : '#');
</script>

<header
    class="sticky top-0 z-30 hidden md:block border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
>
    <div class="flex h-14 items-center gap-3 px-4">
        <!-- Left: vault name + default-star + optional extra content -->
        <div class="flex items-center gap-2 min-w-0 flex-1">
            {#if vault}
                <span class="inline-flex items-center gap-2 min-w-0">
                    {#if vault.icon}
                        <IconRenderer
                            icon={vault.icon}
                            iconType={vault.iconType}
                            size={18}
                            emojiClass="text-lg"
                            class="shrink-0"
                        />
                    {/if}
                    <span class="font-semibold truncate" title={vault.name}>{vault.name}</span>
                </span>

                {#if onSetDefault}
                    <button
                        type="button"
                        onclick={onSetDefault}
                        class={cn(
                            'inline-flex items-center justify-center size-7 rounded-[var(--radius-sm)] transition-colors',
                            vault.isDefault
                                ? 'text-amber-500 hover:text-amber-600'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                        )}
                        title={vault.isDefault ? 'Default vault' : 'Set as default vault'}
                        aria-label={vault.isDefault ? 'Default vault' : 'Set as default vault'}
                        aria-pressed={vault.isDefault}
                    >
                        <Star class={cn('size-4', vault.isDefault ? 'fill-current' : '')} />
                    </button>
                {/if}
            {/if}
            {#if leftSlot}
                <div class="ml-2 min-w-0 flex-1">{@render leftSlot()}</div>
            {/if}
        </div>

        <!-- Right: vault quick actions + primary action -->
        <div class="flex items-center gap-1">
            {#if vault}
                <a
                    href={inviteHref}
                    class={cn(
                        'inline-flex items-center justify-center size-9 rounded-[var(--radius-sm)]',
                        'text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                    )}
                    title="Invite member"
                    aria-label="Invite member"
                >
                    <UserPlus class="size-4" />
                </a>
                <a
                    href={editHref}
                    class={cn(
                        'inline-flex items-center justify-center size-9 rounded-[var(--radius-sm)]',
                        'text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                    )}
                    title="Edit vault"
                    aria-label="Edit vault"
                >
                    <Settings class="size-4" />
                </a>
                <span class="w-px h-6 bg-border mx-1"></span>
            {/if}
            {#if trailing}
                {@render trailing()}
            {/if}
        </div>
    </div>
</header>
