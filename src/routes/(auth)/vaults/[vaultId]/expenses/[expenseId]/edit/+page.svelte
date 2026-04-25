<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { updateExpenseRequestSchema } from '$lib/schemas/expenses';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { DateTimePicker } from '$lib/components/ui/date-time-picker';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { CategoryPicker } from '$lib/components/ui/category-picker';
	import { TagPicker, type TagOption } from '$lib/components/ui/tag-picker';
	import { AttachmentPicker } from '$lib/components/ui/attachment-picker';
	import { Textarea } from '$lib/components/ui/textarea';
	import { CalculatorInput } from '$lib/components/ui/calculator-input';
	import { categoryData } from '$lib/configurations/categories';
	import { paymentTypes } from '$lib/configurations/paymentTypes';
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

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6">

		<h1 class="text-2xl font-bold">Edit Expense</h1>
		<p class="text-sm text-muted-foreground mt-1">
			Update your expense details or delete it
		</p>
	</div>

	<!-- Expense Form -->
	{#if isLoading || isDeleting}
		<Spinner />
	{:else}
		<Card>
			<CardHeader>
				<CardTitle>Expense Details</CardTitle>
				<CardDescription>
					Update the expense information
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form method="POST" use:enhance class="space-y-6">
					<!-- Hidden fields -->
					<input type="hidden" name="id" bind:value={$form.id} />
					<input type="hidden" name="vaultId" bind:value={$form.vaultId} />

					<!-- Amount -->
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

					<!-- Note -->
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

					<!-- Category -->
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

					<!-- Tags -->
					<TagPicker
						label="Tags"
						tags={availableTags}
						bind:value={selectedTagIds}
						onCreate={handleCreateTag}
						disabled={$delayed}
					/>

					<!-- Attachments / Receipts -->
					<AttachmentPicker
						vaultId={data.vaultId}
						label="Receipts"
						initial={data.expense.attachments ?? []}
						bind:value={selectedAttachmentIds}
						disabled={$delayed}
					/>

					<!-- Payment Type -->
					<div class="space-y-2">
						<Label>Payment Type *</Label>
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
						<Label>Paid By</Label>
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

					<!-- Date and Time -->
					<div class="space-y-2">
						<Label for="date">Date & Time *</Label>
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

					<!-- Fund -->
					{#if data.funds && data.funds.length > 0}
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
										Pending Reimb.
									</button>
								</div>
							</div>
						{/if}
					{/if}

					<!-- Actions -->
					<div class="space-y-3 pt-4">
						<div class="flex gap-3">
							<Button type="submit" disabled={$delayed} class="flex-1">
								{#if $delayed}
									Updating...
								{:else}
									Update Expense
								{/if}
							</Button>
							<Button type="button" variant="outline" onclick={handleBack} disabled={$delayed}>
								Cancel
							</Button>
						</div>

						<!-- Delete Section -->
						{#if showDeleteConfirm}
							<div class="border border-destructive rounded-lg p-4 space-y-3">
								<p class="text-sm text-destructive font-medium">
									Are you sure you want to delete this expense? This action cannot be undone.
								</p>
								<div class="flex gap-2">
									<Button
										type="button"
										variant="destructive"
										onclick={handleDelete}
										disabled={isDeleting}
										class="flex-1"
									>
										{#if isDeleting}
											Deleting...
										{:else}
											Confirm Delete
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
								class="w-full text-destructive hover:text-destructive"
							>
								Delete Expense
							</Button>
						{/if}
					</div>
				</form>
			</CardContent>
		</Card>
	{/if}
</div>

<Toaster />
