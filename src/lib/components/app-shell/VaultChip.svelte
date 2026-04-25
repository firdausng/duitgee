<script lang="ts" module>
    export type VaultChipVariant = 'sidebar' | 'appbar' | 'sidebar-collapsed';

    export type VaultChipProps = {
        name: string;
        icon?: string | null;
        color?: string | null;
        variant?: VaultChipVariant;
        showChevron?: boolean;
        class?: string;
    };
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';

    let {
        name,
        icon,
        color,
        variant = 'sidebar',
        showChevron = true,
        class: className,
    }: VaultChipProps = $props();
</script>

<span
    class={cn(
        'flex items-center gap-2 min-w-0 transition-colors',
        variant === 'sidebar' && 'w-full text-left',
        variant === 'appbar' && '',
        variant === 'sidebar-collapsed' && 'justify-center',
        className,
    )}
>
    <span
        class={cn(
            'inline-flex items-center justify-center rounded-md text-base shrink-0 leading-none',
            variant === 'sidebar-collapsed' ? 'size-8' : 'size-7',
        )}
        style="background-color: {color || '#3B82F6'}26;"
        aria-hidden="true"
    >
        {icon || '🏦'}
    </span>
    {#if variant !== 'sidebar-collapsed'}
        <span class="flex-1 min-w-0 truncate font-medium text-sm">{name}</span>
        {#if showChevron}
            <ChevronDown class="size-4 text-muted-foreground shrink-0" />
        {/if}
    {/if}
</span>
