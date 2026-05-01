<script lang="ts">
    import { cn } from "$lib/utils.js";

    type Props = {
        amount: number;
        currency?: string;
        size?: number;
        color?: string;
        class?: string;
        signed?: boolean;
    };

    let {
        amount,
        currency = "$",
        size = 32,
        color = "inherit",
        class: className,
        signed = false,
    }: Props = $props();

    const formatted = $derived(
        Math.abs(amount).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }),
    );
    const parts = $derived(formatted.split("."));
    const whole = $derived(parts[0]);
    const dec = $derived(parts[1]);
    const sign = $derived(signed && amount < 0 ? "−" : signed && amount > 0 ? "+" : "");
</script>

<span
    class={cn("almanac-money", className)}
    style="font-size: {size}px; color: {color};"
>
    {#if sign}<span class="almanac-money__sign">{sign}</span>{/if}<span
        class="almanac-money__cur">{currency}</span
    >{whole}<span class="almanac-money__dec">.{dec}</span>
</span>

<style>
    .almanac-money {
        font-family: "Fraunces", Georgia, serif;
        font-variation-settings: "opsz" 144, "SOFT" 20, "wght" 380;
        line-height: 1;
        letter-spacing: -0.02em;
        font-feature-settings: "tnum";
        white-space: nowrap;
        display: inline-block;
    }
    .almanac-money__sign {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.6em;
        font-weight: 500;
        margin-right: 0.15em;
        opacity: 0.7;
    }
    .almanac-money__cur {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.42em;
        font-weight: 500;
        margin-right: 0.3em;
        vertical-align: 0.6em;
        letter-spacing: 0;
        opacity: 0.7;
    }
    .almanac-money__dec {
        opacity: 0.55;
        font-size: 0.55em;
    }
</style>
