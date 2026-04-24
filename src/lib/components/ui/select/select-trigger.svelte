<script lang="ts">
    import { Select as SelectPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils.js';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';

    let {
        ref = $bindable(null),
        class: className,
        children,
        ...restProps
    }: SelectPrimitive.TriggerProps = $props();
</script>

<SelectPrimitive.Trigger
    bind:ref
    class={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors',
        'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=open]:ring-2 data-[state=open]:ring-ring',
        '[&>span]:truncate',
        className,
    )}
    {...restProps}
>
    {@render children?.()}
    <ChevronDown class="size-4 opacity-50 shrink-0" />
</SelectPrimitive.Trigger>
