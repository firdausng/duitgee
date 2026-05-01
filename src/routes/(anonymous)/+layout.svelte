<script lang="ts">
    import { page } from "$app/state";
    import ThemeToggle from "$lib/components/theme-toggle.svelte";
    import { Button } from "$lib/components/ui/button";

    let { children, data } = $props();

    // All anonymous routes are editorial / almanac-themed.
    const almanacRoutes = ["/", "/privacy", "/terms", "/login", "/register", "/forgot-password"];
    let isAlmanac = $derived(almanacRoutes.includes(page.url.pathname));
    // The editorial layout header (magazine-style) is used everywhere almanac is.
    let isEditorial = $derived(isAlmanac);
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=Newsreader:opsz,wght,ital@6..72,300..700,0..1&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<div class="min-h-screen bg-background" class:dg-almanac={isAlmanac}>
    {#if isEditorial}
        <header class="dg-header dg-header--editorial">
            <div class="dg-header__inner">
                <a href="/" class="dg-wordmark" aria-label="DuitGee home">DuitGee</a>
                <div class="dg-header__actions">
                    <ThemeToggle />
                    {#if data.user}
                        <a href="/vaults">
                            <Button size="sm" class="dg-header__cta">Go to Vaults</Button>
                        </a>
                    {:else}
                        <a href="/login">
                            <Button size="sm" class="dg-header__cta">Sign In</Button>
                        </a>
                    {/if}
                </div>
            </div>
        </header>
    {:else}
        <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div class="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
                <div class="flex items-center gap-6">
                    <a href="/" class="flex items-center gap-2.5">
                        <img src="/favicon.svg" alt="" class="w-7 h-7" />
                        <span class="dg-wordmark dg-wordmark--default">DuitGee</span>
                    </a>
                </div>
                <div class="flex items-center gap-2">
                    <ThemeToggle />
                    {#if data.user}
                        <a href="/vaults">
                            <Button variant="default" size="sm">Go to Vaults</Button>
                        </a>
                    {:else}
                        <a href="/login">
                            <Button variant="default" size="sm">Sign In</Button>
                        </a>
                    {/if}
                </div>
            </div>
        </header>
    {/if}

    <main>
        {@render children?.()}
    </main>
</div>

<style>
    /* Wordmark — italic Fraunces in oxblood, almanac-style.
       Used in both editorial and default header for brand consistency. */
    .dg-wordmark {
        font-family: 'Fraunces', Georgia, serif;
        font-style: italic;
        font-variation-settings: 'opsz' 144, 'SOFT' 80, 'wght' 460;
        font-size: 1.6rem;
        letter-spacing: -0.012em;
        color: var(--almanac-oxblood);
        text-decoration: none;
        line-height: 1;
    }
    .dg-wordmark--default {
        font-size: 1.4rem;
    }

    /* Editorial header — sits flush against the almanac body.
       Hairline ink rule below (almanac signature), no blur. */
    .dg-header--editorial {
        position: sticky;
        top: 0;
        z-index: 50;
        width: 100%;
        background: var(--almanac-paper);
        border-bottom: 1px solid var(--almanac-ink);
    }
    .dg-header__inner {
        max-width: 86rem;
        margin: 0 auto;
        height: 3.75rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 clamp(1rem, 4vw, 4rem);
    }
    .dg-header__actions {
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }

    /* Editorial CTA — oxblood square button, almanac signature */
    :global(.dg-header__cta) {
        background: var(--almanac-oxblood) !important;
        color: var(--almanac-paper) !important;
        border: 1px solid var(--almanac-oxblood) !important;
        border-radius: 0 !important;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
        font-weight: 600 !important;
        letter-spacing: 0.005em !important;
        padding: 0.5rem 1.1rem !important;
        height: auto !important;
        font-size: 0.85rem !important;
        box-shadow: none !important;
    }
    :global(.dg-header__cta:hover) {
        opacity: 0.92 !important;
    }
</style>
