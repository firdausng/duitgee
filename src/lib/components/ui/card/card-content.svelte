<script lang="ts" module>
	import type { CardContentProps } from "./card.svelte";
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CardContentProps = $props();
</script>

<div
	bind:this={ref}
	class={cn("px-6 py-2 pt-0", className)}
	{...restProps}
>
	{@render children?.()}
</div>
