<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { ofetch } from "ofetch";
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { createVaultFormatters } from "$lib/vaultFormatting";
	import { EmptyState } from "$lib/components/ui/empty-state";
	import FileText from "@lucide/svelte/icons/file-text";
	import Plus from "@lucide/svelte/icons/plus";

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
	let vault = $state<{ locale?: string; currency?: string } | null>(null);

	const fmt = $derived(
		createVaultFormatters({
			locale: vault?.locale || 'en-US',
			currency: vault?.currency || 'USD',
		}),
	);

	onMount(async () => {
		try {
			const [tplRes, vaultRes] = await Promise.all([
				ofetch<{ success: boolean; data: { templates: ExpenseTemplate[] } }>(
					`/api/getExpenseTemplates?vaultId=${vaultId}`,
				),
				ofetch<{ success: boolean; data: { vaults: { locale?: string; currency?: string } } }>(
					`/api/getVault?vaultId=${vaultId}`,
				).catch(() => null),
			]);
			templates = tplRes.data.templates || [];
			vault = vaultRes?.data?.vaults ?? null;
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

<div class="container mx-auto py-8 px-4">
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
					<button
						type="button"
						onclick={() => handleEditTemplate(template.id)}
						class="group block w-full text-left"
						aria-label="Edit {template.name}"
					>
						<Card class="p-3 hover:shadow-md hover:border-primary/50 transition-all duration-200 relative">
							<!-- Edit pencil (affordance, hover-emphasized) -->
							<span
								class="absolute top-1 right-1 inline-flex items-center justify-center size-6 rounded-[var(--radius-sm)] text-muted-foreground group-hover:text-foreground transition-colors"
								aria-hidden="true"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-3 w-3"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
								</svg>
							</span>

							<div class="space-y-2">
								<!-- Icon and Name -->
								<div class="flex flex-col items-center text-center gap-1">
									<div class="text-2xl">{template.icon || '📝'}</div>
									<div class="text-xs font-medium break-words w-full">{template.name}</div>
								</div>

								<!-- Amount -->
								{#if template.defaultAmount}
									<div class="font-mono font-semibold text-sm text-center">{fmt.currency(template.defaultAmount)}</div>
								{/if}

								<!-- Usage Count -->
								{#if template.usageCount > 0}
									<p class="text-xs text-muted-foreground text-center">
										{template.usageCount} {template.usageCount === 1 ? 'time' : 'times'}
									</p>
								{/if}
							</div>
						</Card>
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<!-- No Templates State -->
		<Card class="border-dashed">
			<CardContent class="px-4">
				<EmptyState
					icon={FileText}
					title="No templates yet"
					description="Templates are reusable expense shapes — fill in the bits you always type, save as a template, and tap once next time."
				>
					{#snippet primary()}
						<Button onclick={handleCreateTemplate}>
							<Plus class="size-4" />
							Create your first template
						</Button>
					{/snippet}
				</EmptyState>
			</CardContent>
		</Card>
	{/if}
</div>
