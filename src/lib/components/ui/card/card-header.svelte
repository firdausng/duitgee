<script lang="ts" module>
	import type { CardHeaderProps } from "./card.svelte";
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CardHeaderProps = $props();
</script>

<div
	bind:this={ref}
	class={cn("flex flex-col gap-1.5 p-6", className)}
	{...restProps}
>
	{@render children?.()}
</div>
