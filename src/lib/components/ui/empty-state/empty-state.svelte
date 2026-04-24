<script lang="ts" module>
    import { cn } from '$lib/utils';
    import type { Snippet, Component } from 'svelte';

    export interface EmptyStateProps {
        /** Lucide icon component to render in the circle. */
        icon?: Component;
        /** Custom icon via snippet (overrides `icon`). */
        iconSnippet?: Snippet;
        /** Headline. */
        title: string;
        /** Description body. */
        description?: string;
        /** Primary CTA snippet (usually a Button). */
        primary?: Snippet;
        /** Secondary CTA snippet. */
        secondary?: Snippet;
        class?: string;
    }
</script>

<script lang="ts">
    let {
        icon: Icon,
        iconSnippet,
        title,
        description,
        primary,
        secondary,
        class: className,
    }: EmptyStateProps = $props();
</script>

<div class={cn('flex flex-col items-center justify-center text-center py-10 px-4', className)}>
    <div class="flex items-center justify-center size-12 rounded-full bg-muted mb-3">
        {#if iconSnippet}
            {@render iconSnippet()}
        {:else if Icon}
            <Icon class="size-6 text-muted-foreground" />
        {/if}
    </div>
    <h3 class="font-semibold text-lg mb-1">{title}</h3>
    {#if description}
        <p class="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
    {/if}
    {#if primary || secondary}
        <div class="flex flex-wrap items-center justify-center gap-2">
            {#if secondary}{@render secondary()}{/if}
            {#if primary}{@render primary()}{/if}
        </div>
    {/if}
</div>
