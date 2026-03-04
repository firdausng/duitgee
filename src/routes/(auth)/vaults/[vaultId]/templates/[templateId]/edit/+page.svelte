<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { updateExpenseTemplateSchema } from '$lib/schemas/expenseTemplates';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { CategoryPicker } from '$lib/components/ui/category-picker';
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
					headers: { 'Content-Type': 'application/json' }
				});

				if (response.success === false) {
					toast.error(response.error || 'Failed to update template');
					return;
				}

				toast.success('Template updated successfully');
				await goto(`/vaults/${data.vaultId}/expenses/new`);
			} catch (error: any) {
				console.error({ ...error, message: '[template:edit:action] Failed to update template' });
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
				body: { id: data.templateId, vaultId: data.vaultId },
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.success === false) {
				toast.error(response.error || 'Failed to delete template');
				return;
			}

			toast.success('Template deleted successfully');
			await goto(`/vaults/${data.vaultId}/expenses/new`);
		} catch (error: any) {
			console.error({ ...error, message: '[template:edit:delete] Failed to delete template' });
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
						<Textarea
							id="description"
							name="description"
							bind:value={$form.description}
							disabled={$delayed}
							placeholder="Optional description"
							rows={2}
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
								<Textarea
									id="defaultNote"
									name="defaultNote"
									bind:value={$form.defaultNote}
									disabled={$delayed}
									placeholder="Default note for this expense"
									rows={2}
									class={$errors.defaultNote ? 'border-destructive' : ''}
								/>
								{#if $errors.defaultNote}
									<p class="text-sm text-destructive">{$errors.defaultNote}</p>
								{/if}
							</div>

							<!-- Default Category -->
							<CategoryPicker
								name="defaultCategoryName"
								label="Default Category"
								categories={categoryData.categories}
								categoryGroups={categoryData.categoryGroups}
								bind:value={$form.defaultCategoryName}
								disabled={$delayed}
								error={$errors.defaultCategoryName}
								required={true}
							/>

							<!-- Default Payment Type -->
							<div class="space-y-2">
								<Label>Default Payment Type</Label>
								<input type="hidden" name="defaultPaymentType" value={$form.defaultPaymentType} />
								<div class="grid grid-cols-4 gap-2">
									{#each paymentTypes as pt}
										<button
											type="button"
											onclick={() => ($form.defaultPaymentType = pt.value)}
											disabled={$delayed}
											class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
												{$form.defaultPaymentType === pt.value
													? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1'
													: 'border-input'}"
											aria-label={pt.label}
										>
											<span class="text-xl">{pt.icon}</span>
											<span class="text-xs leading-tight">{pt.label}</span>
										</button>
									{/each}
								</div>
								{#if $errors.defaultPaymentType}
									<p class="text-sm text-destructive">{$errors.defaultPaymentType}</p>
								{/if}
							</div>

							<!-- Default Paid By -->
							<div class="space-y-2">
								<Label>Default Paid By</Label>
								<input type="hidden" name="defaultPaidBy" value={$form.defaultPaidBy ?? ''} />
								<div class="grid grid-cols-3 gap-1">
									<button
										type="button"
										onclick={() => ($form.defaultPaidBy = '')}
										disabled={$delayed}
										class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
											{!$form.defaultPaidBy ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
									>
										<span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-base">—</span>
										<span class="leading-tight">None</span>
									</button>
									<button
										type="button"
										onclick={() => ($form.defaultPaidBy = '__creator__')}
										disabled={$delayed}
										class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
											{$form.defaultPaidBy === '__creator__' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
									>
										<span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">★</span>
										<span class="leading-tight">Creator</span>
									</button>
									{#each data.members as member}
										<button
											type="button"
											onclick={() => ($form.defaultPaidBy = member.userId)}
											disabled={$delayed}
											class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
												{$form.defaultPaidBy === member.userId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
										>
											<span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">
												{member.displayName.charAt(0).toUpperCase()}
											</span>
											<span class="leading-tight line-clamp-2">{member.displayName}</span>
										</button>
									{/each}
								</div>
								{#if $errors.defaultPaidBy}
									<p class="text-sm text-destructive">{$errors.defaultPaidBy}</p>
								{/if}
							</div>

							<!-- Default Fund -->
							{#if data.funds && data.funds.length > 0}
								<div class="space-y-2">
									<Label>Default Fund (optional)</Label>
									<input type="hidden" name="defaultFundId" value={$form.defaultFundId ?? ''} />
									<div class="grid grid-cols-3 gap-1">
										<button
											type="button"
											onclick={() => ($form.defaultFundId = null)}
											disabled={$delayed}
											class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
												{!$form.defaultFundId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
										>
											<span class="text-xl">—</span>
											<span class="leading-tight">No fund</span>
										</button>
										{#each data.funds as fund}
											<button
												type="button"
												onclick={() => ($form.defaultFundId = fund.id)}
												disabled={$delayed}
												class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
													{$form.defaultFundId === fund.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
											>
												<span class="text-xl">{fund.icon ?? '💰'}</span>
												<span class="leading-tight line-clamp-2">{fund.name}</span>
												<span class="text-muted-foreground tabular-nums">{fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
											</button>
										{/each}
									</div>
								</div>

								{#if $form.defaultFundId}
									<div class="space-y-2">
										<Label>Default Fund Payment Mode</Label>
										<input type="hidden" name="defaultFundPaymentMode" value={$form.defaultFundPaymentMode} />
										<div class="grid grid-cols-2 gap-2">
											<button
												type="button"
												onclick={() => ($form.defaultFundPaymentMode = 'paid_by_fund')}
												disabled={$delayed}
												class="rounded-md border-2 px-3 py-2.5 text-sm text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
													{$form.defaultFundPaymentMode === 'paid_by_fund'
														? 'border-primary bg-primary text-primary-foreground'
														: 'border-input'}"
											>
												Paid by Fund
											</button>
											<button
												type="button"
												onclick={() => ($form.defaultFundPaymentMode = 'pending_reimbursement')}
												disabled={$delayed}
												class="rounded-md border-2 px-3 py-2.5 text-sm text-center transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
													{$form.defaultFundPaymentMode === 'pending_reimbursement'
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
					</div>

					<!-- Actions -->
					<div class="space-y-3 pt-4">
						<div class="flex gap-3">
							<Button type="submit" disabled={$delayed} class="flex-1">
								{$delayed ? 'Updating...' : 'Update Template'}
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
										{isDeleting ? 'Deleting...' : 'Confirm Delete'}
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
