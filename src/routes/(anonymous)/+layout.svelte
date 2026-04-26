<script lang="ts">
    import { page } from "$app/state";
    import ThemeToggle from "$lib/components/theme-toggle.svelte";
    import { Button } from "$lib/components/ui/button";

    let { children, data } = $props();

    const editorialRoutes = ["/", "/privacy", "/terms"];
    let isEditorial = $derived(editorialRoutes.includes(page.url.pathname));
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<div class="min-h-screen bg-background">
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
    /* Wordmark — Fraunces in both modes for brand consistency */
    .dg-wordmark {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 48, 'SOFT' 30, 'wght' 460;
        font-size: 1.55rem;
        letter-spacing: -0.018em;
        color: oklch(0.21 0.02 50);
        text-decoration: none;
        line-height: 1;
    }
    :global(.dark) .dg-wordmark {
        color: oklch(0.94 0.012 75);
    }
    .dg-wordmark--default {
        font-size: 1.35rem;
    }

    /* Editorial header — sits flush against the warm-bone landing.
       No backdrop blur; a single hairline rule below. */
    .dg-header--editorial {
        position: sticky;
        top: 0;
        z-index: 50;
        width: 100%;
        background: oklch(0.972 0.012 75);
        border-bottom: 1px solid oklch(0.88 0.012 70);
    }
    :global(.dark) .dg-header--editorial {
        background: oklch(0.16 0.012 60);
        border-bottom-color: oklch(0.28 0.014 55);
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

    /* Editorial CTA pill — matches the hero CTA tone */
    :global(.dg-header__cta) {
        background: oklch(0.21 0.02 50) !important;
        color: oklch(0.972 0.012 75) !important;
        border: none !important;
        border-radius: 999px !important;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
        font-weight: 600 !important;
        letter-spacing: -0.005em !important;
        padding: 0.5rem 1.05rem !important;
        height: auto !important;
        font-size: 0.88rem !important;
    }
    :global(.dark) :global(.dg-header__cta) {
        background: oklch(0.94 0.012 75) !important;
        color: oklch(0.16 0.012 60) !important;
    }
</style>
