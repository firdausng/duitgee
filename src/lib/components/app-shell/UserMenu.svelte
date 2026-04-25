<script lang="ts" module>
    export type UserMenuProps = {
        user: { name?: string | null; email?: string | null } | null;
        onSettings: () => void;
        onLogout: () => void;
    };
</script>

<script lang="ts">
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { toggleMode, mode } from 'mode-watcher';
    import { cn } from '$lib/utils';
    import Settings from '@lucide/svelte/icons/settings';
    import LogOut from '@lucide/svelte/icons/log-out';
    import Sun from '@lucide/svelte/icons/sun';
    import Moon from '@lucide/svelte/icons/moon';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';

    let { user, onSettings, onLogout }: UserMenuProps = $props();

    const initial = $derived(
        (user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase(),
    );
</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger
        aria-label="Open user menu"
        class={cn(
            'w-full flex items-center gap-3 px-2 py-1.5 rounded-md',
            'hover:bg-accent transition-colors text-left',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
    >
        <div
            class="size-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0"
        >
            {initial}
        </div>
        <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{user?.name || 'User'}</p>
            {#if user?.email}
                <p class="text-xs text-muted-foreground truncate">{user.email}</p>
            {/if}
        </div>
        <ChevronRight class="size-4 text-muted-foreground shrink-0" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content side="top" align="start" class="min-w-[14rem]">
        <DropdownMenu.Item
            onSelect={(e: Event) => {
                e.preventDefault();
                toggleMode();
            }}
        >
            {#if mode.current === 'dark'}
                <Sun class="size-4" />
                <span>Light mode</span>
            {:else}
                <Moon class="size-4" />
                <span>Dark mode</span>
            {/if}
        </DropdownMenu.Item>
        <DropdownMenu.Item onclick={onSettings}>
            <Settings class="size-4" />
            <span>Settings</span>
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item destructive onclick={onLogout}>
            <LogOut class="size-4" />
            <span>Logout</span>
        </DropdownMenu.Item>
    </DropdownMenu.Content>
</DropdownMenu.Root>
