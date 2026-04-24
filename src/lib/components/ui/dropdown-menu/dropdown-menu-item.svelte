<script lang="ts">
    import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils.js';

    let {
        ref = $bindable(null),
        class: className,
        destructive = false,
        ...restProps
    }: DropdownMenuPrimitive.ItemProps & { destructive?: boolean } = $props();
</script>

<DropdownMenuPrimitive.Item
    bind:ref
    class={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive && 'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive',
        className,
    )}
    {...restProps}
/>
