<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { sharedExpenseDefaultsSchema } from '$lib/schemas/expenses';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { DateTimePicker } from '$lib/components/ui/date-time-picker';
	import { ExpenseRow } from '$lib/components/ui/expense-row';
	import type { ExpenseRowData } from '$lib/components/ui/expense-row/expense-row.svelte';
	import { TagPicker, type TagOption } from '$lib/components/ui/tag-picker';
	import { paymentTypes } from '$lib/configurations/paymentTypes';
	import { categoryData } from '$lib/configurations/categories';
	import { Toaster } from '$lib/components/ui/sonner';
	import { toast } from 'svelte-sonner';
	import { ofetch } from 'ofetch';
	import { localDatetimeToUtcIso, formatDatetimeLocal } from '$lib/utils';
	import { resolve } from '$app/paths';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Plus from '@lucide/svelte/icons/plus';
	import Copy from '@lucide/svelte/icons/copy';
	import Loader2 from '@lucide/svelte/icons/loader-2';

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

	// --- Shared tags ---
	let availableTags = $state<TagOption[]>(data.tags ?? []);
	let sharedTagIds = $state<string[]>(($form.tagIds as string[] | undefined) ?? []);

	$effect(() => {
		$form.tagIds = sharedTagIds;
	});


	async function handleCreateTag(name: string): Promise<TagOption> {
		const response: any = await ofetch('/api/createTag', {
			method: 'POST',
			body: { vaultId: data.vaultId, name },
			headers: { 'Content-Type': 'application/json' },
		});
		if (!response.success) throw new Error(response.error || 'Could not create tag');
		const created: TagOption = {
			id: response.data.id,
			name: response.data.name,
			color: response.data.color,
		};
		availableTags = [...availableTags, created];
		return created;
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
			// Default to current local time so the date input is pre-filled when the row is expanded.
			date: formatDatetimeLocal(new Date()),
			attachmentIds: [],
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
			// Attachments are NOT copied — duplicating typically means
			// "another similar item", not "same receipt twice".
			attachmentIds: [],
			errors: {},
		};
		const idx = rows.findIndex((r) => r.id === rowId);
		rows = [...rows.slice(0, idx + 1), copy, ...rows.slice(idx + 1)];
	}

	// --- Navigation ---
	// returnTo is server-validated (scoped to this vault, same-origin). If the
	// user didn't come via a returnTo-aware link, the server falls back to
	// /vaults/[vaultId]. We prefer this over afterNavigate's `from` because
	// that captures arbitrary pages (e.g. the picker) the user doesn't want
	// to end up on after save.
	const returnTo = $derived(data.returnTo ?? resolve(`/vaults/${data.vaultId}`));

	function handleBack() {
		goto(returnTo);
	}

	// --- Disclosure + compact payment chips ---
	const primaryPaymentValues = ['cash', 'debit', 'credit'];
	const primaryPayments = paymentTypes.filter((p) => primaryPaymentValues.includes(p.value));
	const morePayments = paymentTypes.filter((p) => !primaryPaymentValues.includes(p.value));

	// Auto-show More when the active selection isn't one of the primary chips
	// (e.g. template sets fundId + ewallet — we want the user to see ewallet selected).
	let showMorePayments = $state(false);
	$effect(() => {
		if ($form.paymentType && !primaryPaymentValues.includes($form.paymentType)) {
			showMorePayments = true;
		}
	});

	// Auto-expand "More details" when template pre-filled fund/paid-by/payment
	// that the user would want to see, OR when there's a validation error there.
	const shouldExpandDetails = $derived(
		!!data.template ||
			!!$form.fundId ||
			!!$form.paidBy ||
			!primaryPaymentValues.includes($form.paymentType) ||
			!!$errors.paymentType ||
			!!$errors.paidBy ||
			!!$errors.date,
	);

	const hasMultipleMembers = $derived((data.members?.length ?? 0) > 1);

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
					tagIds: sharedTagIds,
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
					// Per-row attachments — each row's own receipts
					...(row.attachmentIds && row.attachmentIds.length > 0
						? { attachmentIds: row.attachmentIds }
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

			await goto(returnTo);
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
	<div class="container mx-auto py-6 px-4 flex-1 pb-28">
		<!-- Header -->
		<div class="mb-4">
			<h1 class="text-2xl font-bold">
				{#if data.template}
					Expenses from
					<span class="text-primary">
						<a href="/vaults/{data.vaultId}/templates/{data.template.id}/edit"
							>{data.template.icon} {data.template.name}</a
						>
					</span>
				{:else}
					New expense
				{/if}
			</h1>
			{#if data.template?.description}
				<p class="text-sm text-muted-foreground mt-1">{data.template.description}</p>
			{/if}
		</div>

		<!-- Expense Items (primary content) -->
		<div class="space-y-3 mb-4">
			{#if rows.length > 1}
				<div class="flex items-center justify-between">
					<h2 class="text-sm font-medium text-muted-foreground">Items</h2>
					<span class="text-xs text-muted-foreground">{rows.length}/{MAX_ROWS}</span>
				</div>
			{/if}

			{#each rows as row, i (row.id)}
				<ExpenseRow
					bind:row={rows[i]}
					index={i}
					canRemove={rows.length > 1}
					disabled={isLoading}
					vaultId={data.vaultId}
					categories={categoryData.categories}
					categoryGroups={categoryData.categoryGroups}
					members={data.members}
					funds={data.funds}
					{paymentTypes}
					allowedCategoryNames={data.template?.categoryNames ?? undefined}
					onremove={() => removeRow(row.id)}
					onduplicate={() => duplicateRow(row.id)}
					canDuplicate={rows.length < MAX_ROWS}
				/>
			{/each}

			<div class="flex gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					class="flex-1"
					onclick={addRow}
					disabled={isLoading || rows.length >= MAX_ROWS}
				>
					<Plus class="size-3.5" />
					Add item
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => duplicateRow(rows[rows.length - 1].id)}
					disabled={isLoading || rows.length >= MAX_ROWS}
				>
					<Copy class="size-3.5" />
					Duplicate
				</Button>
			</div>
		</div>

		<!-- Shared details (collapsed disclosure) -->
		<details class="group rounded-[var(--radius-md)] border bg-card mb-4" open={shouldExpandDetails}>
			<summary class="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none list-none">
				<div class="min-w-0">
					<span class="text-sm font-semibold">More details</span>
					<p class="text-xs text-muted-foreground mt-0.5 truncate">
						{#if $form.fundId}Fund · {/if}
						{#if hasMultipleMembers && $form.paidBy}Paid by · {/if}
						{paymentTypes.find((p) => p.value === $form.paymentType)?.label ?? $form.paymentType}
						· {$form.date ? new Date($form.date).toLocaleString(undefined, { month: 'short', day: 'numeric' }) : 'now'}
					</p>
				</div>
				<ChevronDown class="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
			</summary>

			<div class="px-4 pb-4 space-y-5 border-t pt-4">
				<!-- Payment Type (compact) -->
				<div class="space-y-2">
					<Label>Payment</Label>
					<div class="flex flex-wrap gap-1.5">
						{#each primaryPayments as pt}
							{@const active = $form.paymentType === pt.value}
							<button
								type="button"
								onclick={() => ($form.paymentType = pt.value)}
								disabled={isLoading}
								class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 {active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
							>
								<span>{pt.icon}</span>
								{pt.label}
							</button>
						{/each}
						{#if !showMorePayments}
							<button
								type="button"
								onclick={() => (showMorePayments = true)}
								disabled={isLoading}
								class="inline-flex items-center gap-1 px-3 h-9 rounded-[var(--radius-sm)] border border-dashed border-border text-sm text-muted-foreground hover:bg-muted"
							>
								<ChevronDown class="size-3.5" />
								More
							</button>
						{:else}
							{#each morePayments as pt}
								{@const active = $form.paymentType === pt.value}
								<button
									type="button"
									onclick={() => ($form.paymentType = pt.value)}
									disabled={isLoading}
									class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 {active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
								>
									<span>{pt.icon}</span>
									{pt.label}
								</button>
							{/each}
						{/if}
					</div>
					{#if $errors.paymentType}
						<p class="text-sm text-destructive">{$errors.paymentType}</p>
					{/if}
				</div>

				<!-- Paid By (hidden for solo vaults) -->
				{#if hasMultipleMembers}
					<div class="space-y-2">
						<Label>Paid by</Label>
						<div class="flex flex-wrap gap-1.5">
							<button
								type="button"
								onclick={() => ($form.paidBy = '')}
								disabled={isLoading}
								class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 {!$form.paidBy ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
							>
								— None
							</button>
							{#each data.members as member}
								{@const active = $form.paidBy === member.userId}
								<button
									type="button"
									onclick={() => ($form.paidBy = member.userId)}
									disabled={isLoading}
									class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 max-w-[12rem] {active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
									title={member.displayName}
								>
									<span class="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold shrink-0">
										{member.displayName.charAt(0).toUpperCase()}
									</span>
									<span class="truncate">{member.displayName}</span>
								</button>
							{/each}
						</div>
						{#if $errors.paidBy}
							<p class="text-sm text-destructive">{$errors.paidBy}</p>
						{/if}
					</div>
				{/if}

				<!-- Date -->
				<div class="space-y-2">
					<Label for="date">Date &amp; time</Label>
					<DateTimePicker
						id="date"
						name="date"
						bind:value={$form.date}
						disabled={isLoading}
						class={$errors.date ? 'border border-destructive rounded-md' : ''}
					/>
					{#if $errors.date}
						<p class="text-sm text-destructive">{$errors.date}</p>
					{/if}
				</div>

				<!-- Fund -->
				{#if data.funds && data.funds.length > 0}
					<div class="space-y-2">
						<Label>Fund <span class="text-xs text-muted-foreground font-normal">(optional)</span></Label>
						<div class="flex flex-wrap gap-1.5">
							<button
								type="button"
								onclick={() => ($form.fundId = null)}
								disabled={isLoading}
								class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors {!$form.fundId ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
							>
								None
							</button>
							{#each data.funds as fund}
								{@const active = $form.fundId === fund.id}
								<button
									type="button"
									onclick={() => ($form.fundId = fund.id)}
									disabled={isLoading}
									class="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] border text-sm transition-colors max-w-[14rem] {active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted text-muted-foreground'}"
									title={fund.name}
								>
									<span>{fund.icon ?? '💰'}</span>
									<span class="truncate">{fund.name}</span>
								</button>
							{/each}
						</div>
					</div>

					{#if $form.fundId}
						<div class="space-y-2">
							<Label>Fund payment mode</Label>
							<div class="grid grid-cols-2 gap-2">
								<button
									type="button"
									onclick={() => ($form.fundPaymentMode = 'paid_by_fund')}
									disabled={isLoading}
									class="rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm transition-colors {$form.fundPaymentMode === 'paid_by_fund' ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}"
								>
									Paid by fund
								</button>
								<button
									type="button"
									onclick={() => ($form.fundPaymentMode = 'pending_reimbursement')}
									disabled={isLoading}
									class="rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm transition-colors {$form.fundPaymentMode === 'pending_reimbursement' ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}"
								>
									Pending reimbursement
								</button>
							</div>
						</div>
					{/if}
				{/if}

				<!-- Shared tags — applied to every expense in this batch -->
				<TagPicker
					label="Tags (applied to all items)"
					tags={availableTags}
					bind:value={sharedTagIds}
					onCreate={handleCreateTag}
					disabled={isLoading}
				/>
			</div>
		</details>
	</div>

	<!-- Sticky bottom action bar -->
	<div class="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-30">
		<div class="container mx-auto px-4 py-3 flex gap-2">
			<Button type="button" variant="outline" onclick={handleBack} disabled={isLoading}>
				Cancel
			</Button>
			<Button type="button" onclick={handleSubmit} disabled={isLoading} class="flex-1">
				{#if isLoading}
					<Loader2 class="size-4 animate-spin" />
					Saving...
				{:else if rows.length === 1}
					Save
				{:else}
					Save {rows.length} items
				{/if}
			</Button>
		</div>
	</div>
</div>

<style>
	details > summary::-webkit-details-marker {
		display: none;
	}
</style>

<Toaster />
