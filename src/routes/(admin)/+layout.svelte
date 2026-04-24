<script lang="ts">
    import ThemeToggle from '$lib/components/theme-toggle.svelte';
    import { Button } from '$lib/components/ui/button';
    import { authClientBase } from '$lib/client/auth-client-base';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';

    let { children, data } = $props();

    const authClient = authClientBase({ basePath: data.basePath });

    async function signOut() {
        await authClient.signOut();
        await goto('/login');
    }

    function isActive(href: string): boolean {
        return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
    }

    const navItems = [
        { href: '/ops', label: 'Overview' },
    ];
</script>

<div class="min-h-screen bg-background">
    <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div class="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
            <div class="flex items-center gap-6">
                <a href="/ops" class="font-semibold">DuitGee Admin</a>
                <nav class="hidden md:flex items-center gap-1">
                    {#each navItems as item}
                        <a
                            href={item.href}
                            class="px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-muted {isActive(item.href) ? 'bg-muted font-medium' : 'text-muted-foreground'}"
                        >
                            {item.label}
                        </a>
                    {/each}
                </nav>
            </div>
            <div class="flex items-center gap-2">
                <span class="hidden sm:inline text-xs text-muted-foreground">{data.adminUser.email}</span>
                <ThemeToggle />
                <Button variant="ghost" size="sm" onclick={() => goto('/vaults')}>Back to app</Button>
                <Button variant="ghost" size="sm" onclick={signOut}>Sign out</Button>
            </div>
        </div>
    </header>

    <main class="container mx-auto max-w-screen-2xl px-4 py-6">
        {@render children?.()}
    </main>
</div>
