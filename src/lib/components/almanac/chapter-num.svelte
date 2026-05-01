<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import { cn } from "$lib/utils.js";

    type Props = HTMLAttributes<HTMLSpanElement> & {
        children?: Snippet;
        class?: string;
    };

    let { children, class: className, ...rest }: Props = $props();
</script>

<span class={cn("almanac-chap-num", className)} {...rest}>
    {@render children?.()}
</span>

<style>
    .almanac-chap-num {
        font-family: "Fraunces", Georgia, serif;
        font-style: italic;
        font-variation-settings: "opsz" 24, "SOFT" 60;
        font-size: 14px;
        color: var(--almanac-gold);
        line-height: 1.2;
        letter-spacing: 0.01em;
    }
</style>
