<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { sharedExpenseDefaultsSchema } from '$lib/schemas/expenses';
	import { afterNavigate, goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ExpenseRow } from '$lib/components/ui/expense-row';
	import type { ExpenseRowData } from '$lib/components/ui/expense-row/expense-row.svelte';
	import { paymentTypes } from '$lib/configurations/paymentTypes';
	import { categoryData } from '$lib/configurations/categories';
	import { Toaster } from '$lib/components/ui/sonner';
	import { toast } from 'svelte-sonner';
	import { ofetch } from 'ofetch';
	import { localDatetimeToUtcIso, formatDatetimeLocal } from '$lib/utils';
	import { resolve } from '$app/paths';

	let { data } = $props();
	let isLoading = $state(false);

	// --- Shared defaults managed by superForm ---
	const { form, errors, delayed } = superForm(data.form, {
		validators: valibotClient(sharedExpenseDefaultsSchema),
	});

	// Set default date to current local time
	if (!$form.date) {
		$form.date = formatDatetimeLocal(new Date());
	}

	// --- Expense rows managed by $state ---
	const MAX_ROWS = 20;

	function createEmptyRow(): ExpenseRowData {
		return {
			id: crypto.randomUUID(),
			amount: data.template?.defaultAmount || undefined,
			categoryName: data.template?.defaultCategoryName || '',
			note: data.template?.defaultNote || '',
			expanded: false,
			errors: {},
		};
	}

	let rows = $state<ExpenseRowData[]>([createEmptyRow()]);

	function addRow() {
		if (rows.length >= MAX_ROWS) return;
		rows = [...rows, createEmptyRow()];
	}

	function removeRow(rowId: string) {
		if (rows.length <= 1) return;
		rows = rows.filter((r) => r.id !== rowId);
	}

	function duplicateRow(rowId: string) {
		if (rows.length >= MAX_ROWS) return;
		const source = rows.find((r) => r.id === rowId);
		if (!source) return;
		const copy: ExpenseRowData = {
			id: crypto.randomUUID(),
			amount: source.amount,
			categoryName: source.categoryName,
			note: source.note,
			expanded: source.expanded,
			paymentType: source.paymentType,
			paidBy: source.paidBy,
			date: source.date,
			fundId: source.fundId,
			fundPaymentMode: source.fundPaymentMode,
			errors: {},
		};
		const idx = rows.findIndex((r) => r.id === rowId);
		rows = [...rows.slice(0, idx + 1), copy, ...rows.slice(idx + 1)];
	}

	// --- Navigation ---
	let previousPage: string = resolve(`/vaults/${data.vaultId}`);
	afterNavigate(({ from }) => {
		previousPage = from?.url.pathname || previousPage;
	});

	function handleBack() {
		goto(previousPage);
	}

	// --- Submit ---
	async function handleSubmit() {
		// Validate rows client-side
		let hasErrors = false;
		rows = rows.map((row) => {
			const rowErrors: ExpenseRowData['errors'] = {};
			if (!row.amount || row.amount < 0.01) {
				rowErrors.amount = 'Amount must be greater than 0';
				hasErrors = true;
			}
			if (!row.categoryName) {
				rowErrors.categoryName = 'Category is required';
				hasErrors = true;
			}
			return { ...row, errors: rowErrors };
		});

		if (!$form.date) {
			toast.error('Date is required');
			return;
		}

		if (hasErrors) {
			toast.error('Please fix errors in the expense items');
			return;
		}

		isLoading = true;

		try {
			const payload = {
				vaultId: data.vaultId,
				templateId: data.templateId ?? undefined,
				shared: {
					paymentType: $form.paymentType,
					date: localDatetimeToUtcIso($form.date),
					paidBy: $form.paidBy,
					fundId: $form.fundId,
					fundPaymentMode: $form.fundId ? $form.fundPaymentMode : null,
				},
				items: rows.map((row) => ({
					amount: row.amount!,
					categoryName: row.categoryName,
					note: row.note || undefined,
					...(row.expanded && row.paymentType !== undefined
						? { paymentType: row.paymentType }
						: {}),
					...(row.expanded && row.paidBy !== undefined
						? { paidBy: row.paidBy }
						: {}),
					...(row.expanded && row.date
						? { date: localDatetimeToUtcIso(row.date) }
						: {}),
					...(row.expanded && row.fundId !== undefined
						? { fundId: row.fundId }
						: {}),
					...(row.expanded && row.fundPaymentMode !== undefined
						? { fundPaymentMode: row.fundPaymentMode }
						: {}),
				})),
			};

			const response = await ofetch('/api/createExpenses', {
				method: 'POST',
				body: payload,
				headers: { 'Content-Type': 'application/json' },
			});

			if (response.success === false) {
				toast.error(response.error || 'Failed to create expenses');
				return;
			}

			const count = response.data?.created ?? rows.length;
			toast.success(
				count === 1
					? 'Expense created successfully'
					: `${count} expenses created successfully`,
			);

			await goto(`/vaults/${data.vaultId}`);
		} catch (error: any) {
			console.error({
				...error,
				message: '[expense:new:action] Failed to create expenses',
			});
			const errorMessage =
				error?.data?.error ||
				error?.message ||
				'Failed to create expenses. Please try again.';
			toast.error(errorMessage);
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>New Expenses - DuitGee</title>
</svelte:head>

<div class="relative min-h-screen flex flex-col">
	<div class="container mx-auto py-8 px-4 flex-1">
		<!-- Header -->
		<div class="mb-6">
			<h1 class="text-2xl font-bold">
				{#if data.template}
					Expenses from
					<span class="text-sky-500"
						><a href="/vaults/{data.vaultId}/templates/{data.template.id}/edit"
							>{data.template.icon} {data.template.name}</a
						></span
					>
				{:else}
					Create Expenses
				{/if}
			</h1>
			{#if data.template?.description}
				<p class="text-sm text-muted-foreground mt-1">{data.template.description}</p>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex gap-3 mb-6">
			<Button type="button" variant="outline" onclick={handleBack} disabled={isLoading}>
				Cancel
			</Button>
			<Button
				type="button"
				disabled={isLoading}
				class="flex-1"
				onclick={handleSubmit}
			>
				{#if isLoading}
					Creating...
				{:else}
					{rows.length === 1 ? 'Done' : `Create All (${rows.length} items)`}
				{/if}
			</Button>
		</div>

		<!-- Expense Rows -->
		<div class="space-y-4 mb-6">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">Expense Items</h2>
				<span class="text-sm text-muted-foreground">{rows.length}/{MAX_ROWS}</span>
			</div>

			{#each rows as row, i (row.id)}
				<ExpenseRow
					bind:row={rows[i]}
					index={i}
					canRemove={rows.length > 1}
					disabled={isLoading}
					categories={categoryData.categories}
					categoryGroups={categoryData.categoryGroups}
					members={data.members}
					funds={data.funds}
					{paymentTypes}
					onremove={() => removeRow(row.id)}
					onduplicate={() => duplicateRow(row.id)}
					canDuplicate={rows.length < MAX_ROWS}
				/>
			{/each}

			<div class="flex gap-2">
				<Button
					type="button"
					variant="outline"
					class="flex-1"
					onclick={addRow}
					disabled={isLoading || rows.length >= MAX_ROWS}
				>
					+ Add Item
				</Button>
				<Button
					type="button"
					variant="outline"
					class="flex-1"
					onclick={() => duplicateRow(rows[rows.length - 1].id)}
					disabled={isLoading || rows.length >= MAX_ROWS}
				>
					+ Duplicate
				</Button>
			</div>
		</div>

		<!-- Shared Defaults -->
		<Card>
			<CardHeader>
				<CardTitle>Shared Details</CardTitle>
			</CardHeader>
			<CardContent class="space-y-6">
				<!-- Payment Type -->
				<div class="space-y-2">
					<Label>Payment Type *</Label>
					<div class="grid grid-cols-4 gap-2">
						{#each paymentTypes as pt}
							<button
								type="button"
								onclick={() => ($form.paymentType = pt.value)}
								disabled={isLoading}
								class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
									{$form.paymentType === pt.value
										? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1'
										: 'border-input'}"
								aria-label={pt.label}
							>
								<span class="text-xl">{pt.icon}</span>
								<span class="text-xs leading-tight">{pt.label}</span>
							</button>
						{/each}
					</div>
					{#if $errors.paymentType}
						<p class="text-sm text-destructive">{$errors.paymentType}</p>
					{/if}
				</div>

				<!-- Paid By -->
				<div class="space-y-2">
					<Label>Paid By</Label>
					<div class="grid grid-cols-3 gap-1">
						<button
							type="button"
							onclick={() => ($form.paidBy = '')}
							disabled={isLoading}
							class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
								{!$form.paidBy
									? 'border-primary bg-primary/10 ring-1 ring-primary'
									: 'border-input'}"
						>
							<span
								class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-base"
								>—</span
							>
							<span class="leading-tight">None</span>
						</button>
						{#each data.members as member}
							<button
								type="button"
								onclick={() => ($form.paidBy = member.userId)}
								disabled={isLoading}
								class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
									{$form.paidBy === member.userId
										? 'border-primary bg-primary/10 ring-1 ring-primary'
										: 'border-input'}"
							>
								<span
									class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold"
								>
									{member.displayName.charAt(0).toUpperCase()}
								</span>
								<span class="leading-tight line-clamp-2">{member.displayName}</span>
							</button>
						{/each}
					</div>
					{#if $errors.paidBy}
						<p class="text-sm text-destructive">{$errors.paidBy}</p>
					{/if}
				</div>

				<!-- Date and Time -->
				<div class="space-y-2">
					<Label for="date">Date & Time *</Label>
					<Input
						id="date"
						name="date"
						type="datetime-local"
						bind:value={$form.date}
						disabled={isLoading}
						class={$errors.date ? 'border-destructive' : ''}
					/>
					{#if $errors.date}
						<p class="text-sm text-destructive">{$errors.date}</p>
					{/if}
				</div>

				<!-- Fund -->
				{#if data.funds && data.funds.length > 0}
					<div class="space-y-2">
						<Label>Fund (optional)</Label>
						<div class="grid grid-cols-3 gap-1">
							<button
								type="button"
								onclick={() => ($form.fundId = null)}
								disabled={isLoading}
								class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
									{!$form.fundId
										? 'border-primary bg-primary/10 ring-1 ring-primary'
										: 'border-input'}"
							>
								<span class="text-xl">—</span>
								<span class="leading-tight">No fund</span>
							</button>
							{#each data.funds as fund}
								<button
									type="button"
									onclick={() => ($form.fundId = fund.id)}
									disabled={isLoading}
									class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
										{$form.fundId === fund.id
											? 'border-primary bg-primary/10 ring-1 ring-primary'
											: 'border-input'}"
								>
									<span class="text-xl">{fund.icon ?? '💰'}</span>
									<span class="leading-tight line-clamp-2">{fund.name}</span>
									<span class="text-muted-foreground tabular-nums"
										>{fund.balance.toLocaleString(undefined, {
											minimumFractionDigits: 2,
										})}</span
									>
								</button>
							{/each}
						</div>
					</div>

					{#if $form.fundId}
						<div class="space-y-2">
							<Label>Fund Payment Mode</Label>
							<div class="grid grid-cols-2 gap-2">
								<button
									type="button"
									onclick={() => ($form.fundPaymentMode = 'paid_by_fund')}
									disabled={isLoading}
									class="rounded-md border-2 px-3 py-2.5 text-sm text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
										{$form.fundPaymentMode === 'paid_by_fund'
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-input'}"
								>
									Paid by Fund
								</button>
								<button
									type="button"
									onclick={() => ($form.fundPaymentMode = 'pending_reimbursement')}
									disabled={isLoading}
									class="rounded-md border-2 px-3 py-2.5 text-sm text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
										{$form.fundPaymentMode === 'pending_reimbursement'
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-input'}"
								>
									Pending Reimb.
								</button>
							</div>
						</div>
					{/if}
				{/if}
			</CardContent>
		</Card>

		<!-- Mobile: Add bottom padding to account for floating elements -->
		<div class="sm:hidden pb-24"></div>
	</div>
</div>

<Toaster />
