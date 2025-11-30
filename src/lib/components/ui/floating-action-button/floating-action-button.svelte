<script lang="ts" module>
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { WithElementRef } from '$lib/utils.js';

	export type FloatingActionButtonProps = WithElementRef<
		HTMLButtonAttributes,
		{
			onclick?: () => void;
			disabled?: boolean;
			children?: import('svelte').Snippet;
			icon?: import('svelte').Snippet;
		}
	>;
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		onclick,
		disabled = false,
		children,
		icon,
		ref = $bindable(null),
		...restProps
	}: FloatingActionButtonProps = $props();
</script>

<button
	bind:this={ref}
	type="button"
	{onclick}
	{disabled}
	class={cn(
		'fixed bottom-6 right-6 z-50',
		'flex items-center gap-2',
		'bg-primary text-primary-foreground',
		'rounded-full shadow-lg hover:shadow-xl',
		'px-6 py-4',
		'font-semibold',
		'transition-all duration-200',
		'hover:scale-105 active:scale-95',
		'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
		'md:px-6 md:py-4',
		'sm:px-5 sm:py-3.5',
		className
	)}
	{...restProps}
>
	{#if icon}
		<span class="w-5 h-5 flex-shrink-0">
			{@render icon()}
		</span>
	{/if}
	{#if children}
		<span class="hidden sm:inline">
			{@render children()}
		</span>
	{/if}
</button>
