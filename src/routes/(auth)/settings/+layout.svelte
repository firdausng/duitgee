<script lang="ts">
    import { page } from '$app/state';
    import { cn } from '$lib/utils';
    import { SETTINGS_SECTIONS } from './settings-nav';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';

    let { children } = $props();

    const currentPath = $derived(page.url.pathname);
    function isActive(href: string): boolean {
        return currentPath === href || currentPath.startsWith(href + '/');
    }
</script>

<svelte:head>
    <title>Settings - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4 max-w-5xl">
    <div class="mb-6">
        <h1 class="text-2xl font-bold tracking-tight">Settings</h1>
        <p class="text-sm text-muted-foreground mt-1">Manage your account settings and preferences</p>
    </div>

    <div class="md:grid md:grid-cols-[200px_1fr] md:gap-8">
        <!-- Sub-nav: list on mobile (tappable rows), sticky rail on desktop -->
        <nav aria-label="Settings sections" class="mb-4 md:mb-0">
            <ul class="space-y-1 md:sticky md:top-20">
                {#each SETTINGS_SECTIONS as section (section.id)}
                    {@const Icon = section.icon}
                    {@const active = isActive(section.href)}
                    <li>
                        <a
                            href={section.href}
                            aria-current={active ? 'page' : undefined}
                            class={cn(
                                'flex items-center gap-3 rounded-md transition-colors',
                                'px-3 py-2.5 md:py-2 text-sm',
                                active
                                    ? 'bg-accent text-accent-foreground font-medium'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                            )}
                        >
                            <Icon class="size-4 shrink-0" />
                            <span class="flex-1 truncate">{section.label}</span>
                            <ChevronRight class="size-4 text-muted-foreground shrink-0 md:hidden" />
                        </a>
                    </li>
                {/each}
            </ul>
        </nav>

        <!-- Section content -->
        <div class="min-w-0">
            {@render children?.()}
        </div>
    </div>
</div>
