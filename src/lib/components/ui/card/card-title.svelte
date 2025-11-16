<script lang="ts" module>
	import type { CardTitleProps } from "./card.svelte";
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CardTitleProps = $props();
</script>

<h3
	bind:this={ref}
	class={cn("font-semibold leading-none tracking-tight", className)}
	{...restProps}
>
	{@render children?.()}
</h3>
