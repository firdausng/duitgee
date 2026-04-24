<script lang="ts" module>
    import { cn } from '$lib/utils';
    import type { Snippet } from 'svelte';

    export type AmountSign = 'auto' | 'positive' | 'negative' | 'neutral';
    export type AmountSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

    export interface AmountProps {
        /** The numeric amount. Signed according to `sign` prop or by value when sign='auto'. */
        value: number;
        /** Override the color treatment. `auto` infers from value sign. */
        sign?: AmountSign;
        /** Display size. Uses mono font throughout. */
        size?: AmountSize;
        /** Show explicit +/− prefix. Default true for positive/negative, false for neutral. */
        showSign?: boolean;
        /** Override the formatted text (e.g. for currency). If omitted, renders as-is. */
        formatted?: string;
        /** Locale + currency for Intl.NumberFormat when `formatted` isn't provided. */
        locale?: string;
        currency?: string;
        decimals?: number;
        /** Additional class names. */
        class?: string;
    }
</script>

<script lang="ts">
    let {
        value,
        sign = 'auto',
        size = 'md',
        showSign = true,
        formatted,
        locale = 'en-US',
        currency = 'USD',
        decimals = 2,
        class: className,
    }: AmountProps = $props();

    const resolvedSign = $derived<Exclude<AmountSign, 'auto'>>(
        sign === 'auto'
            ? value > 0
                ? 'positive'
                : value < 0
                  ? 'negative'
                  : 'neutral'
            : sign,
    );

    const body = $derived(
        formatted ??
            new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            }).format(Math.abs(value)),
    );

    const prefix = $derived(
        showSign && resolvedSign !== 'neutral'
            ? resolvedSign === 'positive'
                ? '+'
                : '−'
            : '',
    );

    const colorClass = $derived(
        {
            positive: 'text-[color:var(--amount-positive)]',
            negative: 'text-[color:var(--amount-negative)]',
            neutral: 'text-[color:var(--amount-neutral)]',
        }[resolvedSign],
    );

    const sizeClass = $derived(
        {
            xs: 'text-xs',
            sm: 'text-sm',
            md: 'text-base',
            lg: 'text-lg font-semibold',
            xl: 'text-xl font-semibold',
            hero: 'text-3xl font-bold',
        }[size],
    );
</script>

<span class={cn('font-mono tabular-nums whitespace-nowrap', sizeClass, colorClass, className)}>
    {prefix}{body}
</span>
