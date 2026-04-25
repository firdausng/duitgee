<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { DateTimePicker } from '$lib/components/ui/date-time-picker';
	import { CategoryPicker } from '$lib/components/ui/category-picker';
	import { Textarea } from '$lib/components/ui/textarea';
	import { CalculatorInput } from '$lib/components/ui/calculator-input';
	import { formatDatetimeLocal } from '$lib/utils';
	import type { PaymentType } from '$lib/configurations/paymentTypes';

	type Category = {
		name: string;
		group: string;
		icon?: string;
		iconType?: string;
	};

	type CategoryGroup = {
		name: string;
		icon?: string | null;
		color?: string;
	};

	type Fund = {
		id: string;
		name: string;
		balance: number;
		icon?: string;
	};

	type Member = {
		userId: string;
		displayName: string;
	};

	export type ExpenseRowData = {
		id: string;
		amount: number | undefined;
		categoryName: string;
		note: string;
		expanded: boolean;
		paymentType?: string;
		paidBy?: string | null;
		date?: string;
		fundId?: string | null;
		fundPaymentMode?: 'paid_by_fund' | 'pending_reimbursement' | null;
		errors: { amount?: string; categoryName?: string };
	};

	interface ExpenseRowProps {
		row: ExpenseRowData;
		index: number;
		canRemove: boolean;
		canDuplicate: boolean;
		disabled: boolean;
		categories: Category[];
		categoryGroups: CategoryGroup[];
		members: Member[];
		funds: Fund[];
		paymentTypes: PaymentType[];
		onremove: () => void;
		onduplicate: () => void;
	}

	let {
		row = $bindable(),
		index,
		canRemove,
		canDuplicate,
		disabled,
		categories,
		categoryGroups,
		members,
		funds,
		paymentTypes,
		onremove,
		onduplicate,
	}: ExpenseRowProps = $props();

	function toggleExpanded() {
		// DateTimePicker has a string-default $bindable, so its value can never be undefined.
		// Backfill rows constructed without a date with the current local time.
		if (row.date === undefined) row.date = formatDatetimeLocal(new Date());
		row.expanded = !row.expanded;
	}
</script>

<div class="rounded-lg border bg-card p-4 space-y-4">
	<!-- Row header -->
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
		<div class="flex items-center gap-1">
			{#if canDuplicate}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={onduplicate}
					{disabled}
					class="h-7 px-2 text-muted-foreground hover:text-foreground"
					aria-label="Duplicate item"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
						<path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
						<path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
					</svg>
				</Button>
			{/if}
			{#if canRemove}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={onremove}
					{disabled}
					class="h-7 px-2 text-muted-foreground hover:text-destructive"
					aria-label="Remove item"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
				</Button>
			{/if}
		</div>
	</div>

	<!-- Amount -->
	<div class="space-y-2">
		<Label>Amount *</Label>
		<CalculatorInput
			name="amount-{row.id}"
			bind:value={row.amount}
			{disabled}
			class={row.errors.amount ? 'border-destructive' : ''}
			error={!!row.errors.amount}
		/>
		{#if row.errors.amount}
			<p class="text-sm text-destructive">{row.errors.amount}</p>
		{/if}
	</div>

	<!-- Category -->
	<CategoryPicker
		name="category-{row.id}"
		label="Category"
		{categories}
		categoryGroups={categoryGroups as any}
		bind:value={row.categoryName}
		{disabled}
		error={row.errors.categoryName}
		required={true}
	/>

	<!-- Note -->
	<div class="space-y-2">
		<Label>Description</Label>
		<Textarea
			name="note-{row.id}"
			bind:value={row.note}
			{disabled}
			placeholder="What was this expense for?"
			rows={1}
		/>
	</div>

	<!-- Expand toggle for per-row overrides -->
	<button
		type="button"
		onclick={toggleExpanded}
		{disabled}
		class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-3 w-3 transition-transform {row.expanded ? 'rotate-90' : ''}"
			viewBox="0 0 20 20"
			fill="currentColor"
		>
			<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
		</svg>
		Override shared fields
	</button>

	<!-- Per-row overrides (expandable) -->
	{#if row.expanded}
		<div class="space-y-4 border-t pt-4">
			<!-- Payment Type override -->
			<div class="space-y-2">
				<Label>Payment Type</Label>
				<div class="grid grid-cols-4 gap-2">
					{#each paymentTypes as pt}
						<button
							type="button"
							onclick={() => (row.paymentType = pt.value)}
							{disabled}
							class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
								{row.paymentType === pt.value
									? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1'
									: 'border-input'}"
							aria-label={pt.label}
						>
							<span class="text-xl">{pt.icon}</span>
							<span class="text-xs leading-tight">{pt.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Paid By override -->
			<div class="space-y-2">
				<Label>Paid By</Label>
				<div class="grid grid-cols-3 gap-1">
					<button
						type="button"
						onclick={() => (row.paidBy = '')}
						{disabled}
						class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
							{row.paidBy !== undefined && !row.paidBy ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
					>
						<span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-base">—</span>
						<span class="leading-tight">None</span>
					</button>
					{#each members as member}
						<button
							type="button"
							onclick={() => (row.paidBy = member.userId)}
							{disabled}
							class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
								{row.paidBy === member.userId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
						>
							<span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">
								{member.displayName.charAt(0).toUpperCase()}
							</span>
							<span class="leading-tight line-clamp-2">{member.displayName}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Date override -->
			<div class="space-y-2">
				<Label>Date & Time</Label>
				<DateTimePicker bind:value={row.date} {disabled} />
			</div>

			<!-- Fund override -->
			{#if funds.length > 0}
				<div class="space-y-2">
					<Label>Fund</Label>
					<div class="grid grid-cols-3 gap-1">
						<button
							type="button"
							onclick={() => { row.fundId = null; row.fundPaymentMode = null; }}
							{disabled}
							class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
								{row.fundId !== undefined && !row.fundId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
						>
							<span class="text-xl">—</span>
							<span class="leading-tight">No fund</span>
						</button>
						{#each funds as fund}
							<button
								type="button"
								onclick={() => (row.fundId = fund.id)}
								{disabled}
								class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
									{row.fundId === fund.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
							>
								<span class="text-xl">{fund.icon ?? '💰'}</span>
								<span class="leading-tight line-clamp-2">{fund.name}</span>
								<span class="text-muted-foreground tabular-nums">{fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
							</button>
						{/each}
					</div>
				</div>

				{#if row.fundId}
					<div class="space-y-2">
						<Label>Fund Payment Mode</Label>
						<div class="grid grid-cols-2 gap-2">
							<button
								type="button"
								onclick={() => (row.fundPaymentMode = 'paid_by_fund')}
								{disabled}
								class="rounded-md border-2 px-3 py-2.5 text-sm text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
									{row.fundPaymentMode === 'paid_by_fund'
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-input'}"
							>
								Paid by Fund
							</button>
							<button
								type="button"
								onclick={() => (row.fundPaymentMode = 'pending_reimbursement')}
								{disabled}
								class="rounded-md border-2 px-3 py-2.5 text-sm text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
									{row.fundPaymentMode === 'pending_reimbursement'
										? 'border-primary bg-primary text-primary-foreground'
										: 'border-input'}"
							>
								Pending Reimb.
							</button>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>
