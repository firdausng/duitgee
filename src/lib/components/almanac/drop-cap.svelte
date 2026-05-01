<script lang="ts">
    import type { Snippet } from "svelte";
    import { cn } from "$lib/utils.js";

    type Props = {
        children?: Snippet;
        class?: string;
        as?: "p" | "div";
        [key: string]: unknown;
    };

    let { children, class: className, as = "p", ...rest }: Props = $props();
</script>

<svelte:element this={as} class={cn("almanac-drop-cap", className)} {...rest}>
    {@render children?.()}
</svelte:element>

<style>
    .almanac-drop-cap {
        font-family: "Newsreader", "Fraunces", Georgia, serif;
        font-size: 16px;
        line-height: 1.6;
        color: var(--almanac-ink-2);
        margin: 0;
    }
    .almanac-drop-cap::first-letter {
        font-family: "Fraunces", Georgia, serif;
        font-style: italic;
        font-variation-settings: "opsz" 144, "SOFT" 80, "wght" 380;
        font-size: 4em;
        float: left;
        line-height: 0.85;
        padding: 6px 12px 0 0;
        color: var(--almanac-oxblood);
    }
</style>
