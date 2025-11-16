<script lang="ts" module>
	import type { CardDescriptionProps } from "./card.svelte";
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CardDescriptionProps = $props();
</script>

<p
	bind:this={ref}
	class={cn("text-muted-foreground text-sm", className)}
	{...restProps}
>
	{@render children?.()}
</p>
