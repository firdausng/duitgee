<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Drawer,
		DrawerContent,
		DrawerHeader,
		DrawerTitle,
		DrawerFooter
	} from '$lib/components/ui/drawer';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface CalculatorInputProps extends HTMLInputAttributes {
		value?: number | string | null;
		disabled?: boolean;
		class?: string;
		error?: boolean;
		nextInputId?: string;
	}

	let {
		value = $bindable(),
		disabled = false,
		class: className = '',
		error = false,
		nextInputId,
		...restProps
	}: CalculatorInputProps = $props();

	let open = $state(false);
	let displayValue = $state('0');
	let previousOpen = $state(false);

	// Initialize display value from prop value
	$effect(() => {
		if (value !== undefined && value !== null && value !== '') {
			displayValue = String(value);
		} else {
			displayValue = '0';
		}
	});

	// Save value when drawer closes
	$effect(() => {
		if (previousOpen && !open) {
			// Drawer just closed - save the value as a number
			if (displayValue === '0' || displayValue === '') {
				value = undefined;
			} else {
				const numValue = parseFloat(displayValue);
				value = isNaN(numValue) ? undefined : numValue;
			}
		}
		previousOpen = open;
	});

	function handleInputClick() {
		if (!disabled) {
			open = true;
		}
	}

	function handleNumberClick(num: string) {
		if (displayValue === '0' && num !== '.') {
			displayValue = num;
		} else if (num === '.') {
			if (!displayValue.includes('.')) {
				displayValue += num;
			}
		} else {
			displayValue += num;
		}
	}

	function handleBackspace() {
		if (displayValue.length > 1) {
			displayValue = displayValue.slice(0, -1);
		} else {
			displayValue = '0';
		}
	}

	function handleClear() {
		displayValue = '0';
	}

	function handleNext() {
		// Close drawer (value will be saved automatically by the $effect)
		open = false;

		// Move focus to next input if specified
		if (nextInputId) {
			setTimeout(() => {
				const nextInput = document.getElementById(nextInputId);
				if (nextInput) {
					nextInput.focus();
				}
			}, 300); // Wait for drawer to close
		}
	}

	const numberButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '00'];
</script>

<Drawer bind:open>
	<Input
		type="number"
		step="0.01"
		min="0"
		{...restProps}
		bind:value
		readonly
		{disabled}
		class={className}
		onclick={handleInputClick}
	/>

	<DrawerContent class="flex flex-col">
		<DrawerHeader class="flex-shrink-0">
			<DrawerTitle>Enter Amount</DrawerTitle>
		</DrawerHeader>

		<div class="flex-1 overflow-y-auto px-4">
			<!-- Display -->
			<div class="mb-4 p-4 bg-muted rounded-lg">
				<div class="text-right text-3xl font-bold font-mono">{displayValue}</div>
			</div>

			<!-- Numpad Grid -->
			<div class="grid grid-cols-4 gap-2 pb-4">
				<!-- Number buttons (3x4 grid for numbers) -->
				{#each numberButtons as num}
					<Button
						type="button"
						variant="outline"
						size="lg"
						class="h-16 text-xl font-semibold"
						onclick={() => handleNumberClick(num)}
					>
						{num}
					</Button>
				{/each}

				<!-- Backspace button -->
				<Button
					type="button"
					variant="outline"
					size="lg"
					class="h-16"
					onclick={handleBackspace}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
						/>
					</svg>
				</Button>

				<!-- Clear button -->
				<Button
					type="button"
					variant="outline"
					size="lg"
					class="h-16 text-lg font-semibold"
					onclick={handleClear}
				>
					C
				</Button>
			</div>
		</div>

		<DrawerFooter class="flex-shrink-0">
			<Button type="button" onclick={handleNext} class="w-full h-12 text-lg">
				Next
			</Button>
		</DrawerFooter>
	</DrawerContent>
</Drawer>
