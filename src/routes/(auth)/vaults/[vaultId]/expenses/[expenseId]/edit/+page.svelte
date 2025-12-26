<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { updateExpenseRequestSchema } from '$lib/schemas/expenses';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { CategoryCombobox } from '$lib/components/ui/category-combobox';
	import { MemberCombobox } from '$lib/components/ui/member-combobox';
	import { CalculatorInput } from '$lib/components/ui/calculator-input';
	import { categoryData } from '$lib/configurations/categories';
	import { paymentTypes } from '$lib/configurations/paymentTypes';
	import { ofetch } from 'ofetch';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Toaster } from "$lib/components/ui/sonner";
	import { toast } from "svelte-sonner";
	import { localDatetimeToUtcIso } from '$lib/utils';

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

	function handleBack() {
		goto(`/vaults/${data.vaultId}`);
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
						<Input
							id="note"
							name="note"
							type="text"
							bind:value={$form.note}
							disabled={$delayed}
							placeholder="What was this expense for?"
							class={$errors.note ? 'border-destructive' : ''}
						/>
						{#if $errors.note}
							<p class="text-sm text-destructive">{$errors.note}</p>
						{/if}
					</div>

					<!-- Category -->
					<CategoryCombobox
						name="categoryName"
						label="Category"
						categories={categoryData.categories}
						bind:value={$form.categoryName}
						disabled={$delayed}
						error={$errors.categoryName}
						required={true}
					/>

					<!-- Payment Type -->
					<div class="space-y-2">
						<Label for="paymentType">Payment Type *</Label>
						<select
							id="paymentType"
							name="paymentType"
							bind:value={$form.paymentType}
							disabled={$delayed}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {$errors.paymentType ? 'border-destructive' : ''}"
						>
							{#each paymentTypes as paymentType}
								<option value={paymentType.value}>
									{paymentType.icon} {paymentType.label}
								</option>
							{/each}
						</select>
						{#if $errors.paymentType}
							<p class="text-sm text-destructive">{$errors.paymentType}</p>
						{/if}
					</div>

					<!-- Paid By -->
					<MemberCombobox
						name="paidBy"
						label="Paid By"
						members={data.members}
						bind:value={$form.paidBy}
						disabled={$delayed}
						error={$errors.paidBy}
						required={false}
						allowEmpty={true}
						emptyLabel="Vault-level expense (no specific person)"
					/>

					<!-- Date and Time -->
					<div class="space-y-2">
						<Label for="date">Date & Time *</Label>
						<Input
							id="date"
							name="date"
							type="datetime-local"
							bind:value={$form.date}
							disabled={$delayed}
							class={$errors.date ? 'border-destructive' : ''}
						/>
						{#if $errors.date}
							<p class="text-sm text-destructive">{$errors.date}</p>
						{/if}
					</div>

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
