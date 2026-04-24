<script lang="ts">
    import { Select as SelectPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils.js';
    import Check from '@lucide/svelte/icons/check';

    let {
        ref = $bindable(null),
        class: className,
        value,
        label,
        children,
        ...restProps
    }: SelectPrimitive.ItemProps = $props();
</script>

<SelectPrimitive.Item
    bind:ref
    {value}
    {label}
    class={cn(
        'relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
    )}
    {...restProps}
>
    {#snippet children({ selected })}
        <span class="flex-1 truncate">
            {#if children}{@render children({ selected, highlighted: false })}{:else}{label}{/if}
        </span>
        {#if selected}
            <span class="absolute right-2 flex items-center">
                <Check class="size-4" />
            </span>
        {/if}
    {/snippet}
</SelectPrimitive.Item>
