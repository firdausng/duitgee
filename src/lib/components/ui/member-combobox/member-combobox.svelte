<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';

	type Member = {
		userId: string;
		displayName: string;
	};

	type Props = {
		members: Member[];
		value?: string;
		onValueChange?: (value: string) => void;
		disabled?: boolean;
		error?: string;
		label: string;
		placeholder?: string;
		required?: boolean;
		name: string;
		allowEmpty?: boolean;
		emptyLabel?: string;
	};

	let {
		members,
		value = $bindable(),
		onValueChange,
		disabled = false,
		error,
		label,
		placeholder = 'Search members...',
		required = false,
		name,
		allowEmpty = true,
		emptyLabel = 'Vault-level expense (no specific person)'
	}: Props = $props();

	let searchQuery = $state('');
	let isOpen = $state(false);
	let inputRef: HTMLInputElement | null = $state(null);

	// Get display name for selected value
	const selectedMemberName = $derived(() => {
		if (!value) return '';
		const member = members.find(m => m.userId === value);
		return member?.displayName || '';
	});

	// Filter members based on search
	const filteredMembers = $derived(() => {
		if (!searchQuery) return members;

		const query = searchQuery.toLowerCase();
		return members.filter(member =>
			member.displayName.toLowerCase().includes(query) ||
			member.userId.toLowerCase().includes(query)
		);
	});

	function handleSelect(userId: string) {
		value = userId;
		searchQuery = '';
		isOpen = false;
		onValueChange?.(userId);
	}

	function handleSelectEmpty() {
		value = '';
		searchQuery = '';
		isOpen = false;
		onValueChange?.('');
	}

	function handleInputFocus() {
		isOpen = true;
	}

	function handleInputBlur() {
		// Delay to allow click on member
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
			<Input
				bind:ref={inputRef}
				type="text"
				placeholder={selectedMemberName() || (value ? value : placeholder)}
				bind:value={searchQuery}
				onfocus={handleInputFocus}
				onblur={handleInputBlur}
				{disabled}
				class={cn(error ? 'border-destructive' : '', 'pr-20')}
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
					{#if allowEmpty}
						<button
							type="button"
							class="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors border-b mb-1"
							onmousedown={(e) => {
								e.preventDefault();
								handleSelectEmpty();
							}}
						>
							<span class="text-muted-foreground italic">{emptyLabel}</span>
						</button>
					{/if}

					{#if filteredMembers().length > 0}
						{#each filteredMembers() as member}
							<button
								type="button"
								class="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
								onmousedown={(e) => {
									e.preventDefault();
									handleSelect(member.userId);
								}}
							>
								{member.displayName}
							</button>
						{/each}
					{:else}
						<div class="px-2 py-6 text-center text-sm text-muted-foreground">
							No members found
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
</div>
