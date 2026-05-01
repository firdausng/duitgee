<script lang="ts">
    import type { Snippet } from "svelte";
    import { cn } from "$lib/utils.js";

    type Props = {
        children?: Snippet;
        class?: string;
        [key: string]: unknown;
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
