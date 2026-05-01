<script lang="ts">
    import type { Snippet } from "svelte";
    import { cn } from "$lib/utils.js";

    type Props = {
        variant?: "single" | "double" | "ornament";
        children?: Snippet;
        class?: string;
    };

    let { variant = "single", children, class: className }: Props = $props();
</script>

{#if variant === "ornament"}
    <div class={cn("almanac-rule almanac-rule--ornament", className)} role="separator">
        {#if children}{@render children()}{:else}⁂{/if}
    </div>
{:else}
    <div class={cn("almanac-rule", `almanac-rule--${variant}`, className)} role="separator"></div>
{/if}

<style>
    .almanac-rule {
        width: 100%;
    }
    .almanac-rule--single {
        height: 1px;
        background: var(--almanac-ink);
        margin: 14px 0;
    }
    .almanac-rule--double {
        height: 5px;
        background: linear-gradient(
            var(--almanac-ink) 0 1px,
            transparent 1px 4px,
            var(--almanac-ink) 4px 5px
        );
        margin: 14px 0;
    }
    .almanac-rule--ornament {
        text-align: center;
        font-family: "Fraunces", Georgia, serif;
        font-size: 14px;
        color: var(--almanac-ink-2);
        padding: 10px 0;
        letter-spacing: 0.5em;
    }
</style>
