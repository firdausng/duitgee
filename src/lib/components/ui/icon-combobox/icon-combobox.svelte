<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import {
		Drawer,
		DrawerContent,
		DrawerHeader,
		DrawerTitle,
	} from '$lib/components/ui/drawer';
	import { cn } from '$lib/utils';

	export type IconItem = {
		icon: string;
		name: string;
		keywords?: string[];
		group: string;
	};

	type Props = {
		icons: IconItem[];
		value?: string;
		onValueChange?: (value: string) => void;
		disabled?: boolean;
		error?: string | string[];
		label: string;
		placeholder?: string;
		required?: boolean;
		name: string;
	};

	let {
		icons,
		value = $bindable(),
		onValueChange,
		disabled = false,
		error,
		label,
		placeholder = 'Search icons...',
		required = false,
		name,
	}: Props = $props();

	let isOpen = $state(false);
	let searchQuery = $state('');

	const currentIcon = $derived(icons.find((i) => i.icon === value));

	// Ordered unique groups (preserves first-seen order)
	const groups = $derived(
		icons.reduce((acc, i) => {
			if (!acc.includes(i.group)) acc.push(i.group);
			return acc;
		}, [] as string[])
	);

	// Grouped & filtered icons
	const groupedIcons = $derived(() => {
		const query = searchQuery.trim().toLowerCase();
		return groups
			.map((group) => ({
				group,
				icons: icons.filter((i) => {
					if (i.group !== group) return false;
					if (!query) return true;
					return (
						i.name.toLowerCase().includes(query) ||
						i.group.toLowerCase().includes(query) ||
						i.keywords?.some((k) => k.toLowerCase().includes(query))
					);
				}),
			}))
			.filter((g) => g.icons.length > 0);
	});

	$effect(() => {
		if (!isOpen) searchQuery = '';
	});

	function openDrawer() {
		if (!disabled) isOpen = true;
	}

	function selectIcon(icon: string) {
		value = icon;
		isOpen = false;
		onValueChange?.(icon);
	}

	function clearValue(e: Event) {
		e.stopPropagation();
		value = '';
		onValueChange?.('');
	}

	const errorMsg = $derived(Array.isArray(error) ? error[0] : error);
</script>

<div class="space-y-2">
	<Label for={name}>{label}{#if required}<span class="text-destructive ml-1">*</span>{/if}</Label>

	<!-- Hidden input for form submission -->
	<input type="hidden" {name} value={value ?? ''} />

	<!-- Trigger button -->
	<button
		type="button"
		onclick={openDrawer}
		{disabled}
		class={cn(
			'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background text-left',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
			'disabled:cursor-not-allowed disabled:opacity-50',
			errorMsg ? 'border-destructive' : '',
		)}
	>
		{#if currentIcon}
			<span class="text-xl shrink-0">{currentIcon.icon}</span>
			<span class="flex-1 truncate">{currentIcon.name}</span>
			<button
				type="button"
				onclick={clearValue}
				disabled={disabled}
				class="text-muted-foreground hover:text-foreground shrink-0"
				aria-label="Clear icon"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
				</svg>
			</button>
		{:else}
			<span class="flex-1 text-muted-foreground">{placeholder}</span>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
			</svg>
		{/if}
	</button>

	{#if errorMsg}
		<p class="text-sm text-destructive">{errorMsg}</p>
	{/if}
</div>

<Drawer bind:open={isOpen}>
	<DrawerContent>
		<DrawerHeader class="pb-0">
			<DrawerTitle>Select Icon</DrawerTitle>
		</DrawerHeader>

		<div class="px-4 pb-2 pt-3">
			<Input
				type="text"
				placeholder="Search icons..."
				bind:value={searchQuery}
				class="w-full"
			/>
		</div>

		<div class="overflow-y-auto px-4 pb-6" style="max-height: 60vh;">
			{#each groupedIcons() as { group, icons: iconList }}
				<div class="mb-3">
					<div class="px-1 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						{group}
					</div>
					<div class="grid grid-cols-8 gap-1 sm:flex sm:flex-wrap sm:justify-center">
						{#each iconList as iconItem}
							<button
								type="button"
								onclick={() => selectIcon(iconItem.icon)}
								title={iconItem.name}
								class={cn(
									'flex items-center justify-center rounded-md p-2 text-2xl transition-colors sm:w-11 sm:h-11',
									iconItem.icon === value
										? 'bg-primary/10 ring-1 ring-primary'
										: 'hover:bg-accent'
								)}
							>
								{iconItem.icon}
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground text-center py-8">No icons found</p>
			{/each}
		</div>
	</DrawerContent>
</Drawer>
