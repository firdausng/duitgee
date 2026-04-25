<script lang="ts" module>
    export type TagChipsTag = {
        id: string;
        name: string;
        color?: string | null;
    };

    export type TagChipsProps = {
        tags: TagChipsTag[];
        /** Visual size of the chip. */
        size?: 'xs' | 'sm';
        class?: string;
    };
</script>

<script lang="ts">
    import { cn } from '$lib/utils';

    let { tags, size = 'xs', class: className }: TagChipsProps = $props();

    const sizeClasses = {
        xs: 'px-1.5 py-0.5 text-[10px]',
        sm: 'px-2 py-0.5 text-xs',
    };
</script>

{#if tags.length > 0}
    <div class={cn('flex flex-wrap gap-1', className)}>
        {#each tags as tag (tag.id)}
            <span
                class={cn('inline-flex items-center rounded font-medium border bg-muted text-muted-foreground border-transparent', sizeClasses[size])}
                style={tag.color ? `background-color: ${tag.color}1A; color: ${tag.color}; border-color: ${tag.color}33;` : ''}
            >
                {tag.name}
            </span>
        {/each}
    </div>
{/if}
