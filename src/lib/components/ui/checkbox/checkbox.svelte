<script lang="ts" module>
	import { Checkbox as CheckboxPrimitive } from "bits-ui";
	import CheckIcon from "@lucide/svelte/icons/check";
	import MinusIcon from "@lucide/svelte/icons/minus";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import { type VariantProps, tv } from "tailwind-variants";

	export const checkboxVariants = tv({
		base: "border-input dark:bg-input/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs peer flex shrink-0 items-center justify-center rounded-[4px] border outline-none transition-shadow focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
		variants: {
			variant: {
				default:
					"data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50",
				destructive:
					"data-[state=checked]:bg-destructive data-[state=checked]:text-white data-[state=checked]:border-destructive dark:data-[state=checked]:bg-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/40",
			},
			size: {
				sm: "size-4",
				md: "size-5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "sm",
		},
	});

	export type CheckboxSize = VariantProps<typeof checkboxVariants>["size"];
	export type CheckboxVariant = VariantProps<typeof checkboxVariants>["variant"];

	export type CheckboxProps = WithoutChildrenOrChild<CheckboxPrimitive.RootProps> & {
		size?: CheckboxSize;
		variant?: CheckboxVariant;
	};
</script>

<script lang="ts">
	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		size = "sm",
		variant = "default",
		class: className,
		...restProps
	}: CheckboxProps = $props();

	// Indicator icon scales one notch smaller than the box.
	const iconClass = $derived(size === "md" ? "size-4" : "size-3.5");
</script>

<CheckboxPrimitive.Root
	bind:ref
	data-slot="checkbox"
	class={cn(checkboxVariants({ variant, size }), className)}
	bind:checked
	bind:indeterminate
	{...restProps}
>
	{#snippet children({ checked, indeterminate })}
		<div data-slot="checkbox-indicator" class="text-current transition-none">
			{#if checked}
				<CheckIcon class={iconClass} />
			{:else if indeterminate}
				<MinusIcon class={iconClass} />
			{/if}
		</div>
	{/snippet}
</CheckboxPrimitive.Root>
