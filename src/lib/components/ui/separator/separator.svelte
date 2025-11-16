<script lang="ts" module>
	import type { HTMLAttributes } from "svelte/elements";
	import type { WithElementRef } from "$lib/utils.js";

	export type SeparatorProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		orientation?: "horizontal" | "vertical";
		decorative?: boolean;
	};
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		orientation = "horizontal",
		decorative = true,
		ref = $bindable(null),
		...restProps
	}: SeparatorProps = $props();
</script>

<div
	bind:this={ref}
	role={decorative ? "none" : "separator"}
	aria-orientation={orientation}
	class={cn(
		"bg-border shrink-0",
		orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
		className
	)}
	{...restProps}
></div>
