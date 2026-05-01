<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import { cn } from "$lib/utils.js";

    type Props = HTMLAttributes<HTMLSpanElement> & {
        children?: Snippet;
        tone?: "oxblood" | "ink" | "muted" | "gold";
        class?: string;
    };

    let { children, tone = "oxblood", class: className, ...rest }: Props = $props();
</script>

<span class={cn("almanac-eyebrow", `almanac-eyebrow--${tone}`, className)} {...rest}>
    {@render children?.()}
</span>

<style>
    .almanac-eyebrow {
        font-family: "JetBrains Mono", ui-monospace, monospace;
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        display: inline-block;
        line-height: 1.2;
    }
    .almanac-eyebrow--oxblood { color: var(--almanac-oxblood); }
    .almanac-eyebrow--ink { color: var(--almanac-ink-2); }
    .almanac-eyebrow--muted { color: var(--almanac-ink-3); }
    .almanac-eyebrow--gold { color: var(--almanac-gold); }
</style>
