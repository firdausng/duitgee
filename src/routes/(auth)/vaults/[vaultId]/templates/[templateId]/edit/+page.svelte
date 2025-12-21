<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { updateExpenseTemplateSchema } from '$lib/schemas/expenseTemplates';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { CategoryCombobox } from '$lib/components/ui/category-combobox';
	import { MemberCombobox } from '$lib/components/ui/member-combobox';
	import { IconCombobox } from '$lib/components/ui/icon-combobox';
	import { categoryData } from '$lib/configurations/categories';
	import { paymentTypes } from '$lib/configurations/paymentTypes';
	import { iconData } from '$lib/configurations/icons';
	import { ofetch } from 'ofetch';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Toaster } from '$lib/components/ui/sonner';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	let isLoading = $state(false);
	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);

	const { form, errors, enhance, delayed } = superForm(data.form, {
		validators: valibotClient(updateExpenseTemplateSchema),
		SPA: true,
		async onUpdate({ form }) {
			if (!form.valid) {
				toast.error('Please fill in all required fields correctly');
				return;
			}

			isLoading = true;

			try {
				const response = await ofetch('/api/updateExpenseTemplate', {
					method: 'POST',
					body: form.data,
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (response.success === false) {
					toast.error(response.error || 'Failed to update template');
					return;
				}

				toast.success('Template updated successfully');

				// Redirect back to template selection page
				await goto(`/vaults/${data.vaultId}/expenses/new`);
			} catch (error: any) {
				console.error({
					...error,
					message: '[template:edit:action] Failed to update template'
				});
				const errorMessage = error?.data?.error || error?.message || 'Failed to update template. Please try again.';
				toast.error(errorMessage);
			} finally {
				isLoading = false;
			}
		}
	});

	function handleBack() {
		goto(`/vaults/${data.vaultId}/expenses/new`);
	}

	async function handleDelete() {
		if (!showDeleteConfirm) {
			showDeleteConfirm = true;
			return;
		}

		isDeleting = true;

		try {
			const response = await ofetch('/api/deleteExpenseTemplate', {
				method: 'POST',
				body: {
					id: data.templateId,
					vaultId: data.vaultId
				},
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.success === false) {
				toast.error(response.error || 'Failed to delete template');
				return;
			}

			toast.success('Template deleted successfully');

			// Redirect back to template selection page
			await goto(`/vaults/${data.vaultId}/expenses/new`);
		} catch (error: any) {
			console.error({
				...error,
				message: '[template:edit:delete] Failed to delete template'
			});
			const errorMessage = error?.data?.error || error?.message || 'Failed to delete template. Please try again.';
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
	<title>Edit Template - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-2 px-4">
	<!-- Template Form -->
	{#if isLoading || isDeleting}
		<Spinner />
	{:else}
		<Card>
			<CardHeader>
				<CardTitle>Template Details</CardTitle>
				<CardDescription>
					Update the template information and default values
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form method="POST" use:enhance class="space-y-6">
					<!-- Hidden fields -->
					<input type="hidden" name="id" bind:value={$form.id} />
					<input type="hidden" name="vaultId" bind:value={$form.vaultId} />

					<!-- Template Name -->
					<div class="space-y-2">
						<Label for="name">Template Name *</Label>
						<Input
							id="name"
							name="name"
							type="text"
							bind:value={$form.name}
							disabled={$delayed}
							placeholder="e.g., Weekly Groceries, Monthly Rent"
							class={$errors.name ? 'border-destructive' : ''}
						/>
						{#if $errors.name}
							<p class="text-sm text-destructive">{$errors.name}</p>
						{/if}
					</div>

					<!-- Description -->
					<div class="space-y-2">
						<Label for="description">Description</Label>
						<Input
							id="description"
							name="description"
							type="text"
							bind:value={$form.description}
							disabled={$delayed}
							placeholder="Optional description"
							class={$errors.description ? 'border-destructive' : ''}
						/>
						{#if $errors.description}
							<p class="text-sm text-destructive">{$errors.description}</p>
						{/if}
					</div>

					<!-- Icon -->
					<IconCombobox
						name="icon"
						label="Icon"
						icons={iconData.icons}
						bind:value={$form.icon}
						disabled={$delayed}
						error={$errors.icon}
						required={false}
						placeholder="Search icons..."
					/>

					<div class="border-t pt-6">
						<h3 class="font-semibold mb-4">Default Expense Values</h3>
						<p class="text-sm text-muted-foreground mb-4">
							These values will pre-fill when you create an expense from this template
						</p>

						<div class="space-y-4">
							<!-- Default Amount -->
							<div class="space-y-2">
								<Label for="defaultAmount">Default Amount</Label>
								<Input
									id="defaultAmount"
									name="defaultAmount"
									type="number"
									step="0.01"
									min="0"
									bind:value={$form.defaultAmount}
									disabled={$delayed}
									placeholder="0.00"
									class={$errors.defaultAmount ? 'border-destructive' : ''}
								/>
								{#if $errors.defaultAmount}
									<p class="text-sm text-destructive">{$errors.defaultAmount}</p>
								{/if}
							</div>

							<!-- Default Note -->
							<div class="space-y-2">
								<Label for="defaultNote">Default Description</Label>
								<Input
									id="defaultNote"
									name="defaultNote"
									type="text"
									bind:value={$form.defaultNote}
									disabled={$delayed}
									placeholder="Default note for this expense"
									class={$errors.defaultNote ? 'border-destructive' : ''}
								/>
								{#if $errors.defaultNote}
									<p class="text-sm text-destructive">{$errors.defaultNote}</p>
								{/if}
							</div>

							<!-- Default Category -->
							<CategoryCombobox
								name="defaultCategoryName"
								label="Default Category"
								categories={categoryData.categories}
								bind:value={$form.defaultCategoryName}
								disabled={$delayed}
								error={$errors.defaultCategoryName}
								required={true}
							/>

							<!-- Default Payment Type -->
							<div class="space-y-2">
								<Label for="defaultPaymentType">Default Payment Type</Label>
								<select
									id="defaultPaymentType"
									name="defaultPaymentType"
									bind:value={$form.defaultPaymentType}
									disabled={$delayed}
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {$errors.defaultPaymentType ? 'border-destructive' : ''}"
								>
									{#each paymentTypes as paymentType}
										<option value={paymentType.value}>
											{paymentType.icon} {paymentType.label}
										</option>
									{/each}
								</select>
								{#if $errors.defaultPaymentType}
									<p class="text-sm text-destructive">{$errors.defaultPaymentType}</p>
								{/if}
							</div>

							<!-- Default Paid By -->
							<MemberCombobox
								name="defaultPaidBy"
								label="Default Paid By"
								members={data.members}
								bind:value={$form.defaultPaidBy}
								disabled={$delayed}
								error={$errors.defaultPaidBy}
								required={false}
								allowEmpty={true}
								emptyLabel="Vault-level expense (no specific person)"
								allowCreator={true}
								creatorLabel="Expense Creator"
							/>
						</div>
					</div>

					<!-- Actions -->
					<div class="space-y-3 pt-4">
						<div class="flex gap-3">
							<Button type="submit" disabled={$delayed} class="flex-1">
								{#if $delayed}
									Updating...
								{:else}
									Update Template
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
									Are you sure you want to delete this template? This action cannot be undone.
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
								Delete Template
							</Button>
						{/if}
					</div>
				</form>
			</CardContent>
		</Card>
	{/if}
</div>

<Toaster />
