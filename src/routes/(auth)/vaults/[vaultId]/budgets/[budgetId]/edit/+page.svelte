<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { updateBudgetSchema } from '$lib/schemas/budgets';
	import { afterNavigate, goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { ScrollArea } from "$lib/components/ui/scroll-area";
	import { categoryData } from '$lib/configurations/categories';
	import { Toaster } from "$lib/components/ui/sonner";
	import { toast } from "svelte-sonner";
	import { ofetch } from 'ofetch';
	import { localDatetimeToUtcIso, formatDatetimeLocal } from '$lib/utils';
	import { resolve } from "$app/paths";

	let { data } = $props();
	let isLoading = $state(false);
	let formElement: HTMLFormElement | undefined = $state();

	const { form, errors, enhance, delayed } = superForm(data.form, {
		validators: valibotClient(updateBudgetSchema),
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
					startDate: form.data.startDate ? localDatetimeToUtcIso(form.data.startDate) : form.data.startDate,
					endDate: form.data.endDate ? localDatetimeToUtcIso(form.data.endDate) : form.data.endDate
				};

				const response = await ofetch('/api/updateBudget', {
					method: 'POST',
					body: payload,
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (response.success === false) {
					toast.error(response.error || 'Failed to update budget');
					return;
				}

				toast.success('Budget updated successfully');

				// Redirect back to the budgets list
				await goto(`/vaults/${data.vaultId}/budgets`);
			} catch (error: any) {
				console.error({
					...error,
					message: '[budget:edit:action] Failed to update budget'
				});
				const errorMessage = error?.data?.error || error?.message || 'Failed to update budget. Please try again.';
				toast.error(errorMessage);
			} finally {
				isLoading = false;
			}
		}
	});

	let previousPage: string = resolve(`/vaults/${data.vaultId}/budgets`);
	afterNavigate(({ from }) => {
		previousPage = from?.url.pathname || previousPage;
	});

	function handleBack() {
		goto(previousPage);
	}

	function handleSubmit() {
		if (formElement) {
			formElement.requestSubmit();
		}
	}

	// Period-specific computed values
	let showEndDate = $derived($form.period === 'custom');
</script>

<svelte:head>
	<title>Edit Budget - DuitGee</title>
</svelte:head>

<Toaster />

<div class="relative min-h-screen flex flex-col">
	<div class="container mx-auto py-4 md:py-8 px-4 flex-1">
		<!-- Header -->
		<div class="mb-4 md:mb-6">
			<h1 class="text-2xl md:text-3xl font-bold">Edit Budget</h1>
			<p class="text-sm text-muted-foreground mt-1">Update spending limit and tracking preferences</p>
		</div>

		<!-- Budget Form -->
		<Card>
			<CardHeader>
				<CardTitle>Budget Details</CardTitle>
				<CardDescription>Modify your budget settings</CardDescription>
			</CardHeader>
			<CardContent>
				<form bind:this={formElement} method="POST" use:enhance class="space-y-6">
					<!-- Hidden fields -->
					<input type="hidden" name="id" bind:value={$form.id} />
					<input type="hidden" name="vaultId" bind:value={$form.vaultId} />

					<!-- Actions -->
					<div class="flex gap-3">
						<Button type="button" variant="outline" onclick={handleBack} disabled={$delayed || isLoading}>
							Cancel
						</Button>
						<Button type="submit" disabled={$delayed || isLoading} class="flex-1">
							{#if $delayed || isLoading}
								Saving...
							{:else}
								Save Changes
							{/if}
						</Button>
					</div>

					<!-- Name -->
					<div class="space-y-2">
						<Label for="name">Name *</Label>
						<Input
							id="name"
							name="name"
							type="text"
							bind:value={$form.name}
							disabled={$delayed || isLoading}
							placeholder="e.g., Monthly Groceries Budget"
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
							disabled={$delayed || isLoading}
							placeholder="Optional description"
							class={$errors.description ? 'border-destructive' : ''}
						/>
						{#if $errors.description}
							<p class="text-sm text-destructive">{$errors.description}</p>
						{/if}
					</div>

					<!-- Amount -->
					<div class="space-y-2">
						<Label for="amount">Budget Amount *</Label>
						<Input
							id="amount"
							name="amount"
							type="number"
							step="0.01"
							min="0"
							bind:value={$form.amount}
							disabled={$delayed || isLoading}
							placeholder="0.00"
							class={$errors.amount ? 'border-destructive' : ''}
						/>
						{#if $errors.amount}
							<p class="text-sm text-destructive">{$errors.amount}</p>
						{/if}
						<p class="text-xs text-muted-foreground">
							Amount in {data.vault?.currency || 'USD'}
						</p>
					</div>

					<!-- Period -->
					<div class="space-y-2">
						<Label for="period">Period *</Label>
						<select
							id="period"
							name="period"
							bind:value={$form.period}
							disabled={$delayed || isLoading}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {$errors.period ? 'border-destructive' : ''}"
						>
							<option value="weekly">Weekly</option>
							<option value="monthly">Monthly</option>
							<option value="custom">Custom Date Range</option>
						</select>
						{#if $errors.period}
							<p class="text-sm text-destructive">{$errors.period}</p>
						{/if}
					</div>

					<!-- Start Date -->
					<div class="space-y-2">
						<Label for="startDate">Start Date *</Label>
						<Input
							id="startDate"
							name="startDate"
							type="datetime-local"
							bind:value={$form.startDate}
							disabled={$delayed || isLoading}
							class={$errors.startDate ? 'border-destructive' : ''}
						/>
						{#if $errors.startDate}
							<p class="text-sm text-destructive">{$errors.startDate}</p>
						{/if}
					</div>

					<!-- End Date (conditional) -->
					{#if showEndDate}
						<div class="space-y-2">
							<Label for="endDate">End Date *</Label>
							<Input
								id="endDate"
								name="endDate"
								type="datetime-local"
								bind:value={$form.endDate}
								disabled={$delayed || isLoading}
								class={$errors.endDate ? 'border-destructive' : ''}
							/>
							{#if $errors.endDate}
								<p class="text-sm text-destructive">{$errors.endDate}</p>
							{/if}
							<p class="text-xs text-muted-foreground">
								Required for custom period budgets
							</p>
						</div>
					{/if}

					<!-- Divider -->
					<div class="border-t pt-6">
						<h3 class="text-sm font-semibold mb-4">Budget Filters (Optional)</h3>
						<p class="text-xs text-muted-foreground mb-4">
							Select categories, templates, or members to track. Leave all unchecked to track all expenses.
						</p>
					</div>

					<!-- Category Filters -->
					<div class="space-y-2">
						<Label>Categories</Label>
						<ScrollArea class="h-72 rounded-md border mr-12">
							{#each categoryData.categories as category}
								<label class="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded-md transition-colors">
									<input
											type="checkbox"
											value={category.name}
											checked={$form.categoryNames?.includes(category.name)}
											onchange={(e) => {
											const checked = e.currentTarget.checked;
											if (checked) {
												$form.categoryNames = [...($form.categoryNames || []), category.name];
											} else {
												$form.categoryNames = ($form.categoryNames || []).filter(c => c !== category.name);
											}
										}}
											disabled={$delayed || isLoading}
											class="h-4 w-4 rounded border-gray-300"
									/>
									<span class="text-lg">{category.icon}</span>
									<span class="text-sm flex-1">{category.name}</span>
								</label>
							{/each}
						</ScrollArea>
<!--						<div class="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">-->
<!--							-->
<!--						</div>-->
						<p class="text-xs text-muted-foreground">
							{#if $form.categoryNames && $form.categoryNames.length > 0}
								Tracking {$form.categoryNames.length} {$form.categoryNames.length === 1 ? 'category' : 'categories'}
							{:else}
								No categories selected (tracking all)
							{/if}
						</p>
					</div>

					<!-- Template Filters -->
					{#if data.templates.length > 0}
						<div class="space-y-2">
							<Label>Templates</Label>
							<ScrollArea class="h-72 rounded-md border mr-12">
								{#each data.templates as template}
									<label class="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded-md transition-colors">
										<input
												type="checkbox"
												value={template.id}
												checked={$form.templateIds?.includes(template.id)}
												onchange={(e) => {
												const checked = e.currentTarget.checked;
												if (checked) {
													$form.templateIds = [...($form.templateIds || []), template.id];
												} else {
													$form.templateIds = ($form.templateIds || []).filter(t => t !== template.id);
												}
											}}
												disabled={$delayed || isLoading}
												class="h-4 w-4 rounded border-gray-300"
										/>
										<span class="text-lg">{template.icon || '📝'}</span>
										<span class="text-sm flex-1">{template.name}</span>
									</label>
								{/each}
							</ScrollArea>
<!--							<div class="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">-->
<!--								-->
<!--							</div>-->
							<p class="text-xs text-muted-foreground">
								{#if $form.templateIds && $form.templateIds.length > 0}
									Tracking {$form.templateIds.length} {$form.templateIds.length === 1 ? 'template' : 'templates'}
								{:else}
									No templates selected (tracking all)
								{/if}
							</p>
						</div>
					{/if}

					<!-- Member Filters -->
					{#if data.members.length > 0}
						<div class="space-y-2">
							<Label>Members</Label>
							<div class="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
								{#each data.members as member}
									<label class="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded-md transition-colors">
										<input
											type="checkbox"
											value={member.userId}
											checked={$form.userIds?.includes(member.userId)}
											onchange={(e) => {
												const checked = e.currentTarget.checked;
												if (checked) {
													$form.userIds = [...($form.userIds || []), member.userId];
												} else {
													$form.userIds = ($form.userIds || []).filter(u => u !== member.userId);
												}
											}}
											disabled={$delayed || isLoading}
											class="h-4 w-4 rounded border-gray-300"
										/>
										<div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
											{member.displayName.charAt(0).toUpperCase()}
										</div>
										<span class="text-sm flex-1">{member.displayName}</span>
									</label>
								{/each}
							</div>
							<p class="text-xs text-muted-foreground">
								{#if $form.userIds && $form.userIds.length > 0}
									Tracking {$form.userIds.length} {$form.userIds.length === 1 ? 'member' : 'members'}
								{:else}
									No members selected (tracking all)
								{/if}
							</p>
						</div>
					{/if}

					<!-- Divider -->
					<div class="border-t pt-6">
						<h3 class="text-sm font-semibold mb-4">Alert Settings</h3>
					</div>

					<!-- Alert Threshold -->
					<div class="space-y-2">
						<Label for="alertThreshold">Alert Threshold (%) *</Label>
						<Input
							id="alertThreshold"
							name="alertThreshold"
							type="number"
							step="1"
							min="0"
							max="100"
							bind:value={$form.alertThreshold}
							disabled={$delayed || isLoading}
							class={$errors.alertThreshold ? 'border-destructive' : ''}
						/>
						{#if $errors.alertThreshold}
							<p class="text-sm text-destructive">{$errors.alertThreshold}</p>
						{/if}
						<p class="text-xs text-muted-foreground">
							Get notified when spending reaches this percentage
						</p>
					</div>

					<!-- Alert Enabled -->
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="alertEnabled"
							name="alertEnabled"
							bind:checked={$form.alertEnabled}
							disabled={$delayed || isLoading}
							class="h-4 w-4 rounded border-gray-300"
						/>
						<Label for="alertEnabled" class="cursor-pointer">Enable alerts</Label>
					</div>

					<!-- Is Active -->
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							id="isActive"
							name="isActive"
							bind:checked={$form.isActive}
							disabled={$delayed || isLoading}
							class="h-4 w-4 rounded border-gray-300"
						/>
						<Label for="isActive" class="cursor-pointer">Budget is active</Label>
					</div>
				</form>
			</CardContent>
		</Card>
	</div>
</div>
