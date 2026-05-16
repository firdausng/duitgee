<script lang="ts" module>
    import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
    import CircleIcon from '@lucide/svelte/icons/circle';
    import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
    import { type VariantProps, tv } from 'tailwind-variants';

    export const radioGroupItemVariants = tv({
        base: 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs outline-none transition-shadow focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50',
        variants: {
            variant: {
                // Classic shadcn radio — circle with dot indicator.
                default:
                    'border-input dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border text-primary',
                // Bare — no built-in border/circle; caller composes a card layout
                // (button-like with ring/border). Selected state is visible via
                // data-[state=checked] on the consumer's class string.
                card: 'cursor-pointer text-left rounded-md border-2 border-input p-3 transition-all hover:bg-accent data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 data-[state=checked]:ring-2 data-[state=checked]:ring-primary data-[state=checked]:ring-offset-1',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    });

    export type RadioGroupItemVariant = VariantProps<typeof radioGroupItemVariants>['variant'];

    export type RadioGroupItemProps = WithoutChildrenOrChild<RadioGroupPrimitive.ItemProps> & {
        variant?: RadioGroupItemVariant;
        children?: import('svelte').Snippet<[{ checked: boolean }]>;
    };
</script>

<script lang="ts">
    let {
        ref = $bindable(null),
        variant = 'default',
        class: className,
        children: contentSnippet,
        ...restProps
    }: RadioGroupItemProps = $props();
</script>

<RadioGroupPrimitive.Item
    bind:ref
    data-slot="radio-group-item"
    class={cn(radioGroupItemVariants({ variant }), className)}
    {...restProps}
>
    {#snippet children({ checked })}
        {#if variant === 'default'}
            <div data-slot="radio-group-indicator" class="relative flex items-center justify-center">
                {#if checked}
                    <CircleIcon class="size-2 fill-primary" />
                {/if}
            </div>
        {:else}
            {@render contentSnippet?.({ checked })}
        {/if}
    {/snippet}
</RadioGroupPrimitive.Item>
