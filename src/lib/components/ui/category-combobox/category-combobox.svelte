<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';

	type Category = {
		name: string;
		group: string;
		icon?: string;
		iconType?: string;
	};

	type Props = {
		categories: Category[];
		value?: string;
		onValueChange?: (value: string) => void;
		disabled?: boolean;
		error?: string;
		label: string;
		placeholder?: string;
		required?: boolean;
		name: string;
	};

	let {
		categories,
		value = $bindable(),
		onValueChange,
		disabled = false,
		error,
		label,
		placeholder = 'Search categories...',
		required = false,
		name
	}: Props = $props();

	let searchQuery = $state('');
	let isOpen = $state(false);
	let inputRef: HTMLInputElement | null = $state(null);

	// Find selected category
	const selectedCategory = $derived(
		categories.find(cat => cat.name === value)
	);

	// Group categories
	const groupedCategories = $derived(
		categories.reduce((acc, category) => {
			if (!acc[category.group]) {
				acc[category.group] = [];
			}
			acc[category.group].push(category);
			return acc;
		}, {} as Record<string, Category[]>)
	);

	// Filter categories based on search
	const filteredGroups = $derived(() => {
		if (!searchQuery) return groupedCategories;

		const query = searchQuery.toLowerCase();
		const filtered: Record<string, Category[]> = {};

		Object.entries(groupedCategories).forEach(([group, cats]) => {
			const matchingCats = cats.filter(cat =>
				cat.name.toLowerCase().includes(query) ||
				group.toLowerCase().includes(query)
			);
			if (matchingCats.length > 0) {
				filtered[group] = matchingCats;
			}
		});

		return filtered;
	});

	function handleSelect(categoryName: string) {
		value = categoryName;
		searchQuery = '';
		isOpen = false;
		onValueChange?.(categoryName);
	}

	function handleInputFocus() {
		isOpen = true;
	}

	function handleInputBlur() {
		// Delay to allow click on category
		setTimeout(() => {
			isOpen = false;
		}, 200);
	}

	function handleClear() {
		value = '';
		searchQuery = '';
		onValueChange?.('');
		inputRef?.focus();
	}
</script>

<div class="space-y-2">
	<Label for={name}>{label}{#if required}<span class="text-destructive ml-1">*</span>{/if}</Label>

	<div class="relative">
		<!-- Hidden input for form submission -->
		<input type="hidden" {name} value={value || ''} />

		<!-- Display/Search Input -->
		<div class="relative">
			{#if selectedCategory?.icon && !searchQuery}
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
					{selectedCategory.icon}
				</span>
			{/if}
			<Input
				bind:ref={inputRef}
				type="text"
				placeholder={value || placeholder}
				bind:value={searchQuery}
				onfocus={handleInputFocus}
				onblur={handleInputBlur}
				{disabled}
				class={cn(error ? 'border-destructive' : '', selectedCategory?.icon && !searchQuery ? 'pl-10 pr-20' : 'pr-20')}
			/>

			{#if value}
				<button
					type="button"
					onclick={handleClear}
					class="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					disabled={disabled}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
				</button>
			{/if}

			<button
				type="button"
				onclick={() => { isOpen = !isOpen; inputRef?.focus(); }}
				class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
				disabled={disabled}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>

		<!-- Dropdown -->
		{#if isOpen}
			<div class="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
				<div class="max-h-60 overflow-auto p-1">
					{#each Object.entries(filteredGroups()) as [group, cats]}
						<div class="px-2 py-1.5">
							<div class="text-xs font-semibold text-muted-foreground mb-1">{group}</div>
							{#each cats as category}
								<button
									type="button"
									class="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors flex items-center gap-2"
									onmousedown={(e) => {
										e.preventDefault();
										handleSelect(category.name);
									}}
								>
									{#if category.icon}
										<span class="text-lg">{category.icon}</span>
									{/if}
									<span>{category.name}</span>
								</button>
							{/each}
						</div>
					{:else}
						<div class="px-2 py-6 text-center text-sm text-muted-foreground">
							No categories found
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
</div>
