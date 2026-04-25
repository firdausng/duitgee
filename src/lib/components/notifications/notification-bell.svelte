<script lang="ts">
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { Button } from '$lib/components/ui/button';
    import Bell from '@lucide/svelte/icons/bell';
    import type { NotificationItem } from '$lib/schemas/notifications';

    interface Props {
        vaultId: string;
    }

    let { vaultId }: Props = $props();

    let refetchKey = $state(0);
    let open = $state(false);

    const dataResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const r = await ofetch<{
                success: boolean;
                data: { items: NotificationItem[]; unreadCount: number };
            }>(`/api/getNotifications?vaultId=${id}&limit=10`);
            return r.success ? r.data : { items: [], unreadCount: 0 };
        },
    );

    const data = $derived(dataResource.current ?? { items: [], unreadCount: 0 });
    const unreadCount = $derived(data.unreadCount);
    const items = $derived(data.items);

    async function markRead(id: string) {
        try {
            await ofetch('/api/markNotificationRead', {
                method: 'POST',
                body: { id },
                headers: { 'Content-Type': 'application/json' },
            });
            refetchKey++;
        } catch (err) {
            console.warn('Failed to mark notification read:', err);
        }
    }

    async function markAllRead() {
        try {
            await ofetch('/api/markAllNotificationsRead', {
                method: 'POST',
                body: { vaultId },
                headers: { 'Content-Type': 'application/json' },
            });
            refetchKey++;
        } catch (err) {
            console.warn('Failed to mark all read:', err);
        }
    }

    function handleClick(item: NotificationItem) {
        if (!item.readAt) markRead(item.id);
        if (item.linkUrl) {
            open = false;
            goto(item.linkUrl);
        }
    }

    function relativeTime(iso: string): string {
        if (!iso) return '';
        const d = new Date(iso);
        const diffMs = Date.now() - d.getTime();
        const mins = Math.floor(diffMs / 60_000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
</script>

<DropdownMenu.Root bind:open>
    <DropdownMenu.Trigger
        class="relative inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
        <Bell class="size-4" />
        {#if unreadCount > 0}
            <span
                class="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold leading-none"
            >
                {unreadCount > 9 ? '9+' : unreadCount}
            </span>
        {/if}
    </DropdownMenu.Trigger>

    <DropdownMenu.Content align="end" class="w-80 max-h-[80vh] overflow-y-auto p-0">
        <div class="flex items-center justify-between px-3 py-2 border-b">
            <span class="text-sm font-semibold">Notifications</span>
            {#if unreadCount > 0}
                <button
                    type="button"
                    onclick={markAllRead}
                    class="text-xs text-primary hover:underline"
                >
                    Mark all read
                </button>
            {/if}
        </div>

        {#if dataResource.loading}
            <div class="p-6 text-center">
                <div class="inline-block animate-spin rounded-full size-5 border-b-2 border-primary"></div>
            </div>
        {:else if items.length === 0}
            <p class="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
        {:else}
            <ul class="divide-y">
                {#each items as item (item.id)}
                    {@const unread = !item.readAt}
                    <li>
                        <button
                            type="button"
                            onclick={() => handleClick(item)}
                            class="w-full px-3 py-2.5 text-left hover:bg-accent flex flex-col gap-0.5 {unread ? 'bg-primary/5' : ''}"
                        >
                            <div class="flex items-start gap-2">
                                {#if unread}
                                    <span class="mt-1.5 size-2 rounded-full bg-primary shrink-0" aria-label="Unread"></span>
                                {/if}
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium leading-snug">{item.title}</p>
                                    {#if item.body}
                                        <p class="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{item.body}</p>
                                    {/if}
                                    <p class="text-[10px] text-muted-foreground mt-1">{relativeTime(item.createdAt)}</p>
                                </div>
                            </div>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </DropdownMenu.Content>
</DropdownMenu.Root>
