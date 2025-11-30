<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { ofetch } from "ofetch";
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";

	let { data } = $props();
	let { vaultId } = data;

	type ExpenseTemplate = {
		id: string;
		vaultId: string;
		name: string;
		description: string | null;
		icon: string | null;
		iconType: string | null;
		defaultNote: string | null;
		defaultAmount: number | null;
		defaultCategoryName: string | null;
		defaultPaidBy: string | null;
		usageCount: number;
		lastUsedAt: string | null;
	};

	let templates = $state<ExpenseTemplate[]>([]);
	let isLoading = $state(true);

	onMount(async () => {
		try {
			const response = await ofetch<{ success: boolean; data: { templates: ExpenseTemplate[] } }>(
				`/api/getExpenseTemplates?vaultId=${vaultId}`
			);
			templates = response.data.templates || [];
		} catch (error) {
			console.error("Failed to fetch templates:", error);
			templates = [];
		} finally {
			isLoading = false;
		}
	});

	function handleUseTemplate(templateId: string) {
		goto(`/vaults/${vaultId}/expenses/new/form?templateId=${templateId}`);
	}

	function handleSkip() {
		goto(`/vaults/${vaultId}/expenses/new/form`);
	}

	function handleBack() {
		goto(`/vaults/${vaultId}`);
	}

	function handleCreateTemplate() {
		goto(`/vaults/${vaultId}/templates/new`);
	}

	function handleEditTemplate(templateId: string) {
		goto(`/vaults/${vaultId}/templates/${templateId}/edit`);
	}
</script>

<svelte:head>
	<title>Select Template - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-8 px-4 max-w-4xl">
	<!-- Header -->
	<div class="mb-6">
		<Button variant="ghost" onclick={handleBack} class="mb-4 -ml-2">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
					clip-rule="evenodd"
				/>
			</svg>
			Back to Vault
		</Button>

		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold">Add Expense</h1>
				<p class="text-sm text-muted-foreground mt-1">
					Choose a template to get started quickly, or create from scratch
				</p>
			</div>
		</div>
	</div>

	{#if isLoading}
		<!-- Loading State -->
		<div class="flex justify-center py-16">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
		</div>
	{:else}
		<!-- Skip Option -->
		<Card class="mb-6 border-dashed">
			<CardContent class="flex items-center justify-between py-6">
				<div>
					<h3 class="font-semibold">Start from scratch</h3>
					<p class="text-sm text-muted-foreground">Create an expense without using a template</p>
				</div>
				<Button onclick={handleSkip} variant="outline">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
							clip-rule="evenodd"
						/>
					</svg>
					Continue
				</Button>
			</CardContent>
		</Card>

		{#if templates.length > 0}
			<!-- Templates List -->
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">Or choose a template</h2>
				<Button variant="outline" onclick={handleCreateTemplate} size="sm">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
					</svg>
					New Template
				</Button>
			</div>

			<div class="grid gap-4">
				{#each templates as template (template.id)}
					<Card class="hover:shadow-md transition-shadow">
						<CardContent class="flex items-center justify-between py-4">
							<div class="flex items-center gap-4 flex-1">
								<div
									class="text-3xl w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10"
								>
									{template.icon || '📝'}
								</div>
								<div class="flex-1">
									<h3 class="font-semibold">{template.name}</h3>
									{#if template.description}
										<p class="text-sm text-muted-foreground">{template.description}</p>
									{/if}
									<div class="flex gap-4 mt-2 text-xs text-muted-foreground">
										{#if template.defaultAmount}
											<span class="font-medium">${template.defaultAmount.toFixed(2)}</span>
										{/if}
										{#if template.defaultCategoryName}
											<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary">
												{template.defaultCategoryName}
											</span>
										{/if}
										{#if template.usageCount > 0}
											<span>Used {template.usageCount} times</span>
										{/if}
									</div>
								</div>
							</div>
							<div class="flex gap-2">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleEditTemplate(template.id)}
									class="px-3"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
									</svg>
									<span class="sr-only">Edit</span>
								</Button>
								<Button onclick={() => handleUseTemplate(template.id)}>
									Use Template
								</Button>
							</div>
						</CardContent>
					</Card>
				{/each}
			</div>
		{:else}
			<!-- No Templates State -->
			<Card class="border-dashed">
				<CardContent class="flex flex-col items-center justify-center py-12">
					<div class="rounded-full bg-muted p-6 mb-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-12 w-12 text-muted-foreground"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<p class="text-muted-foreground text-center mb-4">
						No templates available yet. Create templates to speed up expense entry.
					</p>
					<Button variant="outline" onclick={handleCreateTemplate}>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
						</svg>
						Create Template
					</Button>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>
