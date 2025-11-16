<script lang="ts" module>
	import type { HTMLInputAttributes } from "svelte/elements";
	import type { WithElementRef } from "$lib/utils.js";

	export type InputProps = WithElementRef<HTMLInputAttributes>;
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		type = "text",
		value = $bindable(),
		ref = $bindable(null),
		...restProps
	}: InputProps = $props();
</script>

<input
	bind:this={ref}
	bind:value
	class={cn(
		"border-input bg-background ring-offset-background focus-visible:ring-ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive placeholder:text-muted-foreground flex h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
		className
	)}
	{type}
	{...restProps}
/>
