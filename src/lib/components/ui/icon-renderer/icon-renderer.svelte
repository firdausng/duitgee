<script lang="ts">
    import { cn } from '$lib/utils';
    import { LUCIDE_ICONS, isLucideIconKey } from '$lib/configurations/lucide-icons';

    type Props = {
        icon: string | null | undefined;
        iconType?: string | null | undefined;
        /** Lucide icon size in pixels. Ignored for emoji. */
        size?: number;
        /** Tailwind text-size class controlling emoji glyph size. Ignored for Lucide. */
        emojiClass?: string;
        /** Wrapper classes (applied to the span). */
        class?: string;
        /** Color for Lucide stroke. Defaults to currentColor. */
        color?: string;
        /** Fallback emoji to render when icon is missing or lucide key unknown. */
        fallback?: string;
    };

    let {
        icon,
        iconType,
        size = 20,
        emojiClass = 'text-xl',
        class: className,
        color,
        fallback = '',
    }: Props = $props();

    const isLucide = $derived(iconType === 'lucide' && !!icon && isLucideIconKey(icon));
    const LucideComponent = $derived(isLucide ? LUCIDE_ICONS[icon as keyof typeof LUCIDE_ICONS].component : null);
    const displayEmoji = $derived(icon || fallback);
</script>

{#if isLucide && LucideComponent}
    <span class={cn('inline-flex items-center justify-center', className)}>
        <LucideComponent {size} {color} />
    </span>
{:else if displayEmoji}
    <span class={cn('inline-flex items-center justify-center leading-none', emojiClass, className)}>
        {displayEmoji}
    </span>
{/if}
