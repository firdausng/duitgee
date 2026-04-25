<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { updateExpenseRequestSchema } from '$lib/schemas/expenses';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { DateTimePicker } from '$lib/components/ui/date-time-picker';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { CategoryPicker } from '$lib/components/ui/category-picker';
	import { TagPicker, type TagOption } from '$lib/components/ui/tag-picker';
	import { AttachmentPicker, type ScanApplyPayload } from '$lib/components/ui/attachment-picker';
	import { hasEntitlement } from '$lib/configurations/plans';
	import { page as pageState } from '$app/state';
	import { Textarea } from '$lib/components/ui/textarea';
	import { CalculatorInput } from '$lib/components/ui/calculator-input';
	import { categoryData } from '$lib/configurations/categories';
	import { paymentTypes } from '$lib/configurations/paymentTypes';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { ofetch } from 'ofetch';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Toaster } from "$lib/components/ui/sonner";
	import { toast } from "svelte-sonner";
	import { localDatetimeToUtcIso, utcToLocalDatetimeString } from '$lib/utils';

	let { data } = $props();

	let isLoading = $state(false);
	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);

	const { form, errors, enhance, delayed } = superForm(data.form, {
		validators: valibotClient(updateExpenseRequestSchema),
		SPA: true,
		async onUpdate({ form }) {
			if (!form.valid) {
				toast.error('Please fill in all required fields correctly');
				return;
			}

			isLoading = true;

			try {
				// Convert local datetime to UTC ISO format before sending
				const payload = {
					...form.data,
					date: form.data.date ? localDatetimeToUtcIso(form.data.date) : form.data.date
				};

				const response = await ofetch('/api/updateExpense', {
					method: 'POST',
					body: payload,
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (response.success === false) {
					toast.error(response.error || 'Failed to update expense');
					return;
				}

				toast.success('Expense updated successfully');

				// Redirect back to vault
				await goto(`/vaults/${data.vaultId}`);
			} catch (error: any) {
				console.error({
					...error,
					message: '[expense:edit:action] Failed to update expense'
				});
				const errorMessage = error?.data?.error || error?.message || 'Failed to update expense. Please try again.';
				toast.error(errorMessage);
			} finally {
				isLoading = false;
			}
		}
	});

	// Convert UTC date to local time on the client side
	$effect(() => {
		if (data.expenseDateUtc && !$form.date) {
			$form.date = utcToLocalDatetimeString(data.expenseDateUtc);
		}
	});

	function handleBack() {
		goto(`/vaults/${data.vaultId}`);
	}

	// Local mirror of vault tags so newly created tags appear immediately in the picker
	let availableTags = $state<TagOption[]>(data.tags ?? []);

	// Local selected tag IDs; synced into $form.tagIds before submit
	let selectedTagIds = $state<string[]>(($form.tagIds as string[] | undefined) ?? []);

	$effect(() => {
		$form.tagIds = selectedTagIds;
	});

	// Attachments — bound to $form.attachmentIds via the picker.
	let selectedAttachmentIds = $state<string[]>(
		($form.attachmentIds as string[] | undefined)
			?? ((data.expense.attachments ?? []) as Array<{ id: string }>).map((a) => a.id),
	);

	$effect(() => {
		$form.attachmentIds = selectedAttachmentIds;
	});

	// Plan-gate: receipt scan is Pro-only. Read planId from the auth layout's vault list
	// (auto-merged into pageState.data) and check the entitlement client-side.
	// Server enforces the same check on /api/scanAttachment.
	const currentVaultRow = $derived(
		((pageState.data as { vaults?: Array<{ vaults: { id: string; planId?: string | null } }> })
			.vaults ?? []
		).find((v) => v.vaults?.id === data.vaultId),
	);
	const canScan = $derived(
		hasEntitlement(currentVaultRow?.vaults?.planId ?? 'plan_free', 'attachment:scan'),
	);

	// Apply AI-extracted fields. Preserve user-entered values — only fill empty fields
	// (or `0` amount, since 0 means "user hasn't typed yet" in the calculator input).
	function applyScanResult(scan: ScanApplyPayload) {
		if (scan.amount !== null && (!$form.amount || $form.amount === 0)) {
			$form.amount = scan.amount;
		}
		if (scan.merchant && !$form.note?.trim()) {
			$form.note = scan.merchant;
		}
		if (scan.datetime && !$form.date) {
			$form.date = scan.datetime;
		}
		if (scan.suggestedCategory && !$form.categoryName) {
			$form.categoryName = scan.suggestedCategory;
		}
	}

	async function handleCreateTag(name: string): Promise<TagOption> {
		const response = await ofetch('/api/createTag', {
			method: 'POST',
			body: { vaultId: data.vaultId, name },
			headers: { 'Content-Type': 'application/json' },
		});
		if (!response.success) {
			throw new Error(response.error || 'Could not create tag');
		}
		const created: TagOption = {
			id: response.data.id,
			name: response.data.name,
			color: response.data.color,
		};
		availableTags = [...availableTags, created];
		return created;
	}

	async function handleDelete() {
		if (!showDeleteConfirm) {
			showDeleteConfirm = true;
			return;
		}

		isDeleting = true;

		try {
			const response = await ofetch('/api/deleteExpense', {
				method: 'POST',
				body: {
					id: data.expenseId,
					vaultId: data.vaultId
				},
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.success === false) {
				toast.error(response.error || 'Failed to delete expense');
				return;
			}

			toast.success('Expense deleted successfully');

			// Redirect back to vault
			await goto(`/vaults/${data.vaultId}`);
		} catch (error: any) {
			console.error({
				...error,
				message: '[expense:edit:delete] Failed to delete expense'
			});
			const errorMessage = error?.data?.error || error?.message || 'Failed to delete expense. Please try again.';
			toast.error(errorMessage);
		} finally {
			isDeleting = false;
			showDeleteConfirm = false;
		}
	}

	function cancelDelete() {
		showDeleteConfirm = false;
	}
</script>

<svelte:head>
	<title>Edit Expense - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4 max-w-2xl">
	<!-- Mobile-only page title (desktop has DesktopAppBar with vault name) -->
	<div class="md:hidden mb-4">
		<h1 class="text-xl font-bold">Edit expense</h1>
		<p class="text-sm text-muted-foreground mt-0.5">
			Update or delete this expense.
		</p>
	</div>

	<!-- Expense Form -->
	{#if isLoading || isDeleting}
		<Spinner />
	{:else}
		<Card>
			<CardContent class="pt-6">
				<form method="POST" use:enhance class="space-y-6">
					<!-- Hidden fields -->
					<input type="hidden" name="id" bind:value={$form.id} />
					<input type="hidden" name="vaultId" bind:value={$form.vaultId} />

					{#snippet sectionHeader(label: string)}
						<div class="flex items-center gap-2 mb-2">
							<span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
							<div class="flex-1 h-px bg-border"></div>
						</div>
					{/snippet}

					<!-- BASICS — amount + description -->
					<div class="space-y-3">
						{@render sectionHeader('Basics')}

						<div class="space-y-2">
							<Label for="amount">Amount *</Label>
							<CalculatorInput
								id="amount"
								name="amount"
								bind:value={$form.amount}
								disabled={$delayed}
								class={$errors.amount ? 'border-destructive' : ''}
								error={!!$errors.amount}
								nextInputId="note"
							/>
							{#if $errors.amount}
								<p class="text-sm text-destructive">{$errors.amount}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="note">Description</Label>
							<Textarea
								id="note"
								name="note"
								bind:value={$form.note}
								disabled={$delayed}
								placeholder="What was this expense for?"
								class={$errors.note ? 'border-destructive' : ''}
								rows={2}
							/>
							{#if $errors.note}
								<p class="text-sm text-destructive">{$errors.note}</p>
							{/if}
						</div>
					</div>

					<!-- CATEGORIZATION — category + tags -->
					<div class="space-y-3">
						{@render sectionHeader('Categorization')}

						<CategoryPicker
							name="categoryName"
							label="Category"
							categories={categoryData.categories}
							categoryGroups={categoryData.categoryGroups}
							bind:value={$form.categoryName}
							disabled={$delayed}
							error={$errors.categoryName}
							required={true}
						/>

						<TagPicker
							label="Tags"
							tags={availableTags}
							bind:value={selectedTagIds}
							onCreate={handleCreateTag}
							disabled={$delayed}
						/>
					</div>

					<!-- RECEIPTS — own section so it's prominent -->
					<div class="space-y-3">
						{@render sectionHeader('Receipts')}

						<AttachmentPicker
							vaultId={data.vaultId}
							label=""
							initial={data.expense.attachments ?? []}
							bind:value={selectedAttachmentIds}
							disabled={$delayed}
							{canScan}
							onScanApply={applyScanResult}
						/>
					</div>

					<!-- PAYMENT — payment type + paid by -->
					<div class="space-y-3">
						{@render sectionHeader('Payment')}

					<div class="space-y-2">
						<Label>Payment type *</Label>
						<input type="hidden" name="paymentType" value={$form.paymentType} />
						<div class="grid grid-cols-4 gap-2">
							{#each paymentTypes as pt}
								<button
									type="button"
									onclick={() => ($form.paymentType = pt.value)}
									disabled={$delayed}
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
						<Label>Paid by</Label>
						<input type="hidden" name="paidBy" value={$form.paidBy ?? ''} />
						<div class="grid grid-cols-3 gap-1">
							<button
								type="button"
								onclick={() => ($form.paidBy = '')}
								disabled={$delayed}
								class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
									{!$form.paidBy ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
							>
								<span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-base">—</span>
								<span class="leading-tight">None</span>
							</button>
							{#each data.members as member}
								<button
									type="button"
									onclick={() => ($form.paidBy = member.userId)}
									disabled={$delayed}
									class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
										{$form.paidBy === member.userId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
								>
									<span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">
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
					</div>

					<!-- DATE -->
					<div class="space-y-3">
						{@render sectionHeader('Date')}

						<div class="space-y-2">
							<Label for="date">Date & time *</Label>
							<DateTimePicker
								id="date"
								name="date"
								bind:value={$form.date}
								disabled={$delayed}
								class={$errors.date ? 'border border-destructive rounded-md' : ''}
							/>
							{#if $errors.date}
								<p class="text-sm text-destructive">{$errors.date}</p>
							{/if}
						</div>
					</div>

					<!-- FUND — only renders if vault has any funds -->
					{#if data.funds && data.funds.length > 0}
					<div class="space-y-3">
						{@render sectionHeader('Fund')}
						<div class="space-y-2">
							<Label>Fund (optional)</Label>
							<input type="hidden" name="fundId" value={$form.fundId ?? ''} />
							<div class="grid grid-cols-3 gap-1">
								<button
									type="button"
									onclick={() => ($form.fundId = null)}
									disabled={$delayed}
									class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
										{!$form.fundId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
								>
									<span class="text-xl">—</span>
									<span class="leading-tight">No fund</span>
								</button>
								{#each data.funds as fund}
									<button
										type="button"
										onclick={() => ($form.fundId = fund.id)}
										disabled={$delayed}
										class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
											{$form.fundId === fund.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
									>
										<span class="text-xl">{fund.icon ?? '💰'}</span>
										<span class="leading-tight line-clamp-2">{fund.name}</span>
										<span class="text-muted-foreground tabular-nums">{fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
									</button>
								{/each}
							</div>
						</div>

						{#if $form.fundId}
							<div class="space-y-2">
								<Label>Fund Payment Mode</Label>
								<input type="hidden" name="fundPaymentMode" value={$form.fundPaymentMode} />
								<div class="grid grid-cols-2 gap-2">
									<button
										type="button"
										onclick={() => ($form.fundPaymentMode = 'paid_by_fund')}
										disabled={$delayed}
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
										disabled={$delayed}
										class="rounded-md border-2 px-3 py-2.5 text-sm text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
											{$form.fundPaymentMode === 'pending_reimbursement'
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-input'}"
									>
										Pending reimb.
									</button>
								</div>
							</div>
						{/if}
					</div>
					{/if}

					<!-- ACTIONS -->
					<div class="space-y-3 pt-4 border-t">
						<div class="flex gap-3">
							<Button type="submit" disabled={$delayed} class="flex-1">
								{#if $delayed}
									Updating...
								{:else}
									Update expense
								{/if}
							</Button>
							<Button type="button" variant="outline" onclick={handleBack} disabled={$delayed}>
								Cancel
							</Button>
						</div>

						{#if showDeleteConfirm}
							<div class="border border-destructive rounded-md p-3 space-y-3 bg-destructive/5">
								<p class="text-sm text-destructive font-medium">
									Delete this expense? This cannot be undone.
								</p>
								<div class="flex gap-2">
									<Button
										type="button"
										variant="destructive"
										onclick={handleDelete}
										disabled={isDeleting}
										class="flex-1"
									>
										<Trash2 class="size-4" />
										{#if isDeleting}
											Deleting...
										{:else}
											Confirm delete
										{/if}
									</Button>
									<Button
										type="button"
										variant="outline"
										onclick={cancelDelete}
										disabled={isDeleting}
									>
										Cancel
									</Button>
								</div>
							</div>
						{:else}
							<Button
								type="button"
								variant="outline"
								onclick={handleDelete}
								class="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
							>
								<Trash2 class="size-4" />
								Delete expense
							</Button>
						{/if}
					</div>
				</form>
			</CardContent>
		</Card>
	{/if}
</div>

<Toaster />
