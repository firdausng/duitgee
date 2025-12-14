<script lang="ts">
	import { goto } from "$app/navigation";
	import { ofetch } from "ofetch";
	import { resource } from "runed";
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
	import { createVaultFormatters } from "$lib/vaultFormatting";
	import { scale } from "svelte/transition";

	let { data } = $props();
	let { vaultId, vault } = data;

	// Create vault-specific formatters
	const fmt = createVaultFormatters({
		locale: vault?.locale || 'en-US',
		currency: vault?.currency || 'USD'
	});

	type Budget = {
		id: string;
		vaultId: string;
		name: string;
		description: string | null;
		amount: number;
		period: 'weekly' | 'monthly' | 'custom';
		startDate: string;
		endDate: string | null;
		categoryNames: string[] | null;
		templateIds: string[] | null;
		userIds: string[] | null;
		alertThreshold: number;
		alertEnabled: boolean;
		isActive: boolean;
		createdAt: string;
		updatedAt: string | null;
	};

	type VaultMember = {
		userId: string;
		displayName: string | null;
	};

	// Refetch key to trigger data reload
	let refetchKey = $state(0);

	// Filter state
	let showInactive = $state(false);

	// Resource for budgets
	const budgetsResource = resource(
		() => [vaultId, showInactive, refetchKey] as const,
		async ([id, inactive]) => {
			const urlParams = new URLSearchParams({
				vaultId: id
			});

			if (!inactive) {
				urlParams.append('isActive', 'true');
			}

			const response = await ofetch<{ success: boolean; data: Budget[] }>(
				`/api/getBudgets?${urlParams.toString()}`
			);
			return response.data || [];
		}
	);

	// Resource for expense templates
	const templatesResource = resource(
		() => [vaultId] as const,
		async ([id]) => {
			const response = await ofetch<Client.AppResponse<Client.ExpenseTemplateData>>(
				`/api/getExpenseTemplates?vaultId=${id}`
			);
			return response.data.templates || [];
		}
	);

	// Resource for vault members
	const vaultResource = resource(
		() => [vaultId] as const,
		async ([id]) => {
			const response = await ofetch<{ success: boolean; data: { members: VaultMember[] } }>(
				`/api/getVault?vaultId=${id}`
			);
			return response.data?.members || [];
		}
	);

	const budgets = $derived(budgetsResource.current || []);
	const isLoading = $derived(budgetsResource.loading);
	const templates = $derived(templatesResource.current || []);
	const vaultMembers = $derived(vaultResource.current || []);

	// Helper functions to get names
	function getTemplateName(templateId: string): string {
		if (!Array.isArray(templates) || templates.length === 0 || typeof templates.find !== 'function') {
			return 'Loading...';
		}
		const template = templates.find(t => t.id === templateId);
		return template ? `${template.icon || '📝'} ${template.name}` : 'Unknown Template';
	}

	function getUserDisplayName(userId: string): string {
		if (!Array.isArray(vaultMembers) || vaultMembers.length === 0 || typeof vaultMembers.find !== 'function') {
			return 'Loading...';
		}
		const member = vaultMembers.find(m => m.userId === userId);
		return member?.displayName || 'Unknown User';
	}

	function handleCreateBudget() {
		goto(`/vaults/${vaultId}/budgets/new`);
	}

	function handleEditBudget(budgetId: string) {
		goto(`/vaults/${vaultId}/budgets/${budgetId}/edit`);
	}

	async function handleDeleteBudget(budgetId: string) {
		if (!confirm('Are you sure you want to delete this budget?')) return;

		try {
			await ofetch('/api/deleteBudget', {
				method: 'POST',
				body: JSON.stringify({ id: budgetId, vaultId }),
				headers: { 'Content-Type': 'application/json' }
			});

			refetchKey++;
		} catch (error) {
			console.error('Failed to delete budget:', error);
			alert('Failed to delete budget. Please try again.');
		}
	}

	async function handleToggleActive(budgetId: string, currentActive: boolean) {
		try {
			await ofetch('/api/updateBudget', {
				method: 'POST',
				body: JSON.stringify({
					id: budgetId,
					vaultId,
					isActive: !currentActive
				}),
				headers: { 'Content-Type': 'application/json' }
			});

			refetchKey++;
		} catch (error) {
			console.error('Failed to toggle budget status:', error);
			alert('Failed to update budget status. Please try again.');
		}
	}

	function formatPeriod(period: string): string {
		switch (period) {
			case 'weekly':
				return 'Weekly';
			case 'monthly':
				return 'Monthly';
			case 'custom':
				return 'Custom';
			default:
				return period;
		}
	}

	function formatDateRange(budget: Budget): string {
		const start = new Date(budget.startDate).toLocaleDateString(fmt.getLocale(), {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});

		if (budget.endDate) {
			const end = new Date(budget.endDate).toLocaleDateString(fmt.getLocale(), {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
			return `${start} - ${end}`;
		}

		return `From ${start}`;
	}
</script>

<svelte:head>
	<title>Budgets - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-4 md:py-8 px-4 max-w-6xl">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4 md:mb-6">
		<div>
			<h1 class="text-2xl md:text-3xl font-bold">Budgets</h1>
			<p class="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">Manage spending limits</p>
		</div>
		<Button onclick={handleCreateBudget} size="sm" class="md:h-10">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4 md:mr-2"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
					clip-rule="evenodd"
				/>
			</svg>
			<span class="hidden md:inline">Add Budget</span>
		</Button>
	</div>

	<!-- Filter -->
	<Card class="mb-4 md:mb-6">
		<CardContent class="py-3 md:py-4">
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					id="show-inactive"
					bind:checked={showInactive}
					class="h-4 w-4 rounded border-gray-300"
				/>
				<label for="show-inactive" class="text-sm cursor-pointer">
					Show inactive budgets
				</label>
			</div>
		</CardContent>
	</Card>

	<!-- Budgets List -->
	<Card>
		<CardHeader>
			<CardTitle>Your Budgets</CardTitle>
			<CardDescription>Track and manage spending limits</CardDescription>
		</CardHeader>
		<CardContent>
			{#if isLoading}
				<div class="flex justify-center py-8 md:py-12">
					<div class="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-primary"></div>
				</div>
			{:else if budgets.length === 0}
				<div class="text-center py-8 md:py-12" in:scale={{ start: 0.95, duration: 400 }}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-12 w-12 md:h-16 md:w-16 mx-auto text-muted-foreground mb-3 md:mb-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
						/>
					</svg>
					<p class="text-base md:text-lg text-muted-foreground mb-3 md:mb-4">No budgets yet</p>
					<Button onclick={handleCreateBudget} size="sm" class="md:h-10">Create your first budget</Button>
				</div>
			{:else}
				<div class="space-y-2 md:space-y-3" in:scale={{ start: 0.95, duration: 400 }}>
					{#each budgets as budget (budget.id)}
						<div class="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow bg-card {!budget.isActive ? 'opacity-60' : ''}">
							<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
								<!-- Content Section -->
								<div class="flex-1 min-w-0">
									<!-- Name and Amount -->
									<div class="flex items-start justify-between gap-2 mb-2">
										<div>
											<h3 class="text-base md:text-lg font-semibold flex items-center gap-2">
												{budget.name}
												{#if !budget.isActive}
													<span class="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
														Inactive
													</span>
												{/if}
											</h3>
											{#if budget.description}
												<p class="text-xs md:text-sm text-muted-foreground mt-1">{budget.description}</p>
											{/if}
										</div>
										<div class="text-xl md:text-2xl font-bold text-primary shrink-0">
											{fmt.currency(budget.amount)}
										</div>
									</div>

									<!-- Period and Date Range -->
									<div class="flex flex-wrap items-center gap-1.5 md:gap-2 mb-2">
										<span class="inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-1 rounded-md bg-primary/10 text-primary text-xs md:text-sm font-medium">
											{formatPeriod(budget.period)}
										</span>
										<span class="text-xs md:text-sm text-muted-foreground">
											{formatDateRange(budget)}
										</span>
									</div>

									<!-- Filters Applied -->
									{#if budget.categoryNames?.length || budget.templateIds?.length || budget.userIds?.length}
										<div class="flex flex-wrap items-center gap-1.5 text-xs">
											<span class="text-muted-foreground">Filters:</span>

											{#if budget.categoryNames?.length}
												{#each budget.categoryNames as category}
													<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
														<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
															<path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
														</svg>
														{category}
													</span>
												{/each}
											{/if}

											{#if budget.templateIds?.length}
												{#each budget.templateIds as templateId}
													<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
														<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
															<path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
															<path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
														</svg>
														{getTemplateName(templateId)}
													</span>
												{/each}
											{/if}

											{#if budget.userIds?.length}
												{#each budget.userIds as userId}
													<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
														<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
															<path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
														</svg>
														{getUserDisplayName(userId)}
													</span>
												{/each}
											{/if}
										</div>
									{:else}
										<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
											</svg>
											<span>All categories, templates, and users</span>
										</div>
									{/if}

									<!-- Alert Threshold -->
									{#if budget.alertEnabled}
										<div class="text-xs md:text-sm text-muted-foreground mt-1">
											Alert at {budget.alertThreshold}%
										</div>
									{/if}
								</div>

								<!-- Actions Section -->
								<div class="flex gap-1.5 md:gap-2 shrink-0 self-end md:self-start flex-wrap">
									<Button
										variant="outline"
										size="sm"
										class="h-8 md:h-9"
										onclick={() => handleToggleActive(budget.id, budget.isActive)}
									>
										<span class="text-xs md:text-sm">
											{budget.isActive ? 'Deactivate' : 'Activate'}
										</span>
									</Button>
									<Button
										variant="outline"
										size="sm"
										class="h-8 md:h-9 w-8 md:w-auto p-0 md:px-3"
										onclick={() => handleEditBudget(budget.id)}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
											/>
										</svg>
										<span class="hidden md:inline text-xs md:text-sm">Edit</span>
									</Button>
									<Button
										variant="outline"
										size="sm"
										class="h-8 md:h-9 w-8 md:w-auto p-0 md:px-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
										onclick={() => handleDeleteBudget(budget.id)}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fill-rule="evenodd"
												d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
												clip-rule="evenodd"
											/>
										</svg>
										<span class="hidden md:inline text-xs md:text-sm">Delete</span>
									</Button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
