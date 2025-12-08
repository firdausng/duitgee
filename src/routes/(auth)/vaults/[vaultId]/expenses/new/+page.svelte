<script lang="ts">
	import { onMount } from "svelte";
    import {afterNavigate, goto} from "$app/navigation";
	import { ofetch } from "ofetch";
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import {resolve} from "$app/paths";

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

    let previousPage : string = resolve(`/vaults/${vaultId}`) ;
    afterNavigate(({from}) => {
        previousPage = from?.url.pathname || previousPage
    })

    function handleBack() {
        goto(previousPage);
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

<div class="container mx-auto py-2 px-4 max-w-4xl">
	{#if isLoading}
		<!-- Loading State -->
		<div class="flex justify-center py-16">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
		</div>
	{:else}
		<!-- Skip Option -->
		<Card class="border-dashed my-2">
			<CardContent class="flex items-center justify-between py-2">
				<div>
					<h3 class="font-semibold">Start from scratch</h3>
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
			<!-- Templates Grid -->
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">Or choose a template</h2>
				<Button variant="outline" onclick={handleCreateTemplate} size="sm">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
					</svg>
					New Template
				</Button>
			</div>

			<div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each templates as template (template.id)}
					<Card
						class="hover:shadow-md transition-shadow flex flex-col cursor-pointer"
						onclick={() => handleUseTemplate(template.id)}
					>
						<CardContent class="flex flex-col h-full py-2 relative">
							<!-- Edit Button (Top Right) -->
							<Button
								variant="ghost"
								size="sm"
								onclick={(e) => {
									e.stopPropagation();
									handleEditTemplate(template.id);
								}}
								class="absolute top-2 right-2 px-2"
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

							<!-- Icon -->
							<div class="flex justify-center">
								<div
									class="text-3xl w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10"
								>
									{template.icon || '📝'}
								</div>
							</div>

							<!-- Name and Description -->
							<div class="">
								<h3 class="font-semibold break-words text-center mb-1">{template.name}</h3>
								{#if template.description}
									<p class="text-sm text-muted-foreground line-clamp-2 text-center">{template.description}</p>
								{/if}
							</div>

							<div class="flex flex-wrap justify-center gap-2 text-xs">
								{#if template.defaultAmount}
									<span class="inline-flex items-center px-2 py-1 rounded-md bg-muted font-medium">
										${template.defaultAmount.toFixed(2)}
									</span>
								{/if}
								{#if template.defaultCategoryName}
									<span class="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary">
										{template.defaultCategoryName}
									</span>
								{/if}
							</div>

							{#if template.usageCount > 0}
								<p class="text-xs text-muted-foreground mb-3 text-center">
									Used {template.usageCount} {template.usageCount === 1 ? 'time' : 'times'}
								</p>
							{/if}
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
