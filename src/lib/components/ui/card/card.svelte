<script lang="ts" module>
	import type { HTMLAttributes } from "svelte/elements";
	import type { WithElementRef } from "$lib/utils.js";

	export type CardProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
	export type CardHeaderProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
	export type CardTitleProps = WithElementRef<HTMLAttributes<HTMLHeadingElement>>;
	export type CardDescriptionProps = WithElementRef<HTMLAttributes<HTMLParagraphElement>>;
	export type CardContentProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
	export type CardFooterProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: CardProps = $props();
</script>

<div
	bind:this={ref}
	class={cn("bg-card text-card-foreground rounded-lg border shadow-sm", className)}
	{...restProps}
>
	{@render children?.()}
</div>
