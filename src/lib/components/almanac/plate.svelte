<script lang="ts">
    import type { Snippet } from "svelte";
    import { cn } from "$lib/utils.js";

    type Props = {
        children?: Snippet;
        variant?: "default" | "inset" | "inverted";
        as?: "div" | "section" | "article" | "aside" | "figure";
        class?: string;
        // Pass-through for arbitrary HTML attrs (style, id, role, data-*, aria-*).
        [key: string]: unknown;
    };

    let {
        children,
        variant = "default",
        as = "div",
        class: className,
        ...rest
    }: Props = $props();
</script>

<svelte:element
    this={as}
    class={cn("almanac-plate", `almanac-plate--${variant}`, className)}
    {...rest}
>
    {@render children?.()}
</svelte:element>

<style>
    .almanac-plate {
        padding: 18px;
    }
    .almanac-plate--default {
        background: var(--almanac-card);
        border: 1px solid var(--almanac-ink);
    }
    .almanac-plate--inset {
        background: var(--almanac-paper-2);
        border: 1px dashed var(--almanac-rule-soft);
    }
    .almanac-plate--inverted {
        background: var(--almanac-ink);
        color: var(--almanac-paper);
        border: 1px solid var(--almanac-ink);
    }
</style>
