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
	<title>Templates - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-8 px-4 max-w-4xl">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold">Expense Templates</h1>
				<p class="text-sm text-muted-foreground mt-1">
					Manage your expense templates
				</p>
			</div>
			<Button onclick={handleCreateTemplate}>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
				</svg>
				New Template
			</Button>
		</div>
	</div>

	{#if isLoading}
		<!-- Loading State -->
		<div class="flex justify-center py-16">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
		</div>
	{:else if templates.length > 0}
		<!-- Templates Grid -->
		<div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 justify-items-center">
			{#each templates as template (template.id)}
				<div class="w-full max-w-[200px]">
					<Card class="p-3 cursor-pointer hover:shadow-md transition-shadow duration-200 hover:border-primary/50 relative">
						<!-- Edit Button (Top Right) -->
						<Button
							variant="ghost"
							size="sm"
							onclick={() => handleEditTemplate(template.id)}
							class="absolute top-1 right-1 px-1 h-6"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-3 w-3"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
							</svg>
							<span class="sr-only">Edit</span>
						</Button>

						<div class="space-y-2">
							<!-- Icon and Name -->
							<div class="flex flex-col items-center text-center gap-1">
								<div class="text-2xl">{template.icon || '📝'}</div>
								<div class="text-xs font-medium break-words w-full">{template.name}</div>
							</div>

							<!-- Amount -->
							{#if template.defaultAmount}
								<div class="font-bold text-sm text-center">${template.defaultAmount.toFixed(2)}</div>
							{/if}

							<!-- Usage Count -->
							{#if template.usageCount > 0}
								<p class="text-xs text-muted-foreground text-center">
									{template.usageCount} {template.usageCount === 1 ? 'time' : 'times'}
								</p>
							{/if}
						</div>
					</Card>
				</div>
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
				<Button onclick={handleCreateTemplate}>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
					</svg>
					Create Template
				</Button>
			</CardContent>
		</Card>
	{/if}
</div>
