<script lang="ts" module>
	import type { HTMLLabelAttributes } from "svelte/elements";
	import type { WithElementRef } from "$lib/utils.js";

	export type LabelProps = WithElementRef<HTMLLabelAttributes>;
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: LabelProps = $props();
</script>

<label
	bind:this={ref}
	class={cn(
		"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</label>
