<script lang="ts">
	import { goto } from "$app/navigation";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import type { BudgetProgress } from "./statistics/budgetUtils";

	type Props = {
		budgetProgresses: BudgetProgress[];
		vaultId: string;
		formatCurrency: (amount: number, decimals?: number) => string;
	};

	let { budgetProgresses, vaultId, formatCurrency }: Props = $props();

	function handleViewAllBudgets() {
		goto(`/vaults/${vaultId}/budgets`);
	}

	function handleCreateBudget() {
		goto(`/vaults/${vaultId}/budgets/new`);
	}

	function handleViewBudgetInStats(budgetId: string) {
		goto(`/vaults/${vaultId}/statistics`);
	}

	function getStatusIcon(status: string): string {
		switch (status) {
			case 'under':
				return '✓';
			case 'warning':
				return '⚠';
			case 'over':
			case 'exceeded':
				return '✕';
			default:
				return '';
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'under':
				return 'text-green-600 dark:text-green-400';
			case 'warning':
				return 'text-yellow-600 dark:text-yellow-400';
			case 'over':
			case 'exceeded':
				return 'text-red-600 dark:text-red-400';
			default:
				return '';
		}
	}

	function getProgressBarColor(status: string): string {
		switch (status) {
			case 'under':
				return 'bg-green-500';
			case 'warning':
				return 'bg-yellow-500';
			case 'over':
			case 'exceeded':
				return 'bg-red-500';
			default:
				return 'bg-primary';
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
</script>

<Card class="mb-4 mt-2">
	<CardHeader>
		<div class="flex items-center justify-between">
			<CardTitle class="flex items-center gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
				</svg>
				Budgets
			</CardTitle>
			<div class="flex gap-2">
				{#if budgetProgresses.length > 0}
					<Button
						variant="ghost"
						size="sm"
						onclick={handleViewAllBudgets}
						class="text-xs h-8"
					>
						View All
					</Button>
				{/if}
				<Button
					variant="outline"
					size="sm"
					onclick={handleCreateBudget}
					class="text-xs h-8"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
					</svg>
					Create
				</Button>
			</div>
		</div>
	</CardHeader>
	<CardContent>
		{#if budgetProgresses.length === 0}
			<!-- Empty State -->
			<div class="text-center py-8">
				<div class="rounded-full bg-muted p-4 inline-flex mb-3">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
					</svg>
				</div>
				<p class="text-sm text-muted-foreground mb-3">No active budgets yet</p>
				<Button variant="outline" size="sm" onclick={handleCreateBudget}>
					Create your first budget
				</Button>
			</div>
		{:else}
			<!-- Budget Cards -->
			<div class="space-y-3">
				{#each budgetProgresses as progress (progress.budget.id)}
					<div class="border rounded-lg p-3 hover:shadow-sm transition-shadow">
						<!-- Header -->
						<div class="flex items-start justify-between mb-2">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="text-lg {getStatusColor(progress.status)}">
										{getStatusIcon(progress.status)}
									</span>
									<h4 class="font-semibold text-sm truncate">{progress.budget.name}</h4>
									<span class="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
										{formatPeriod(progress.budget.period)}
									</span>
								</div>
								{#if progress.budget.description}
									<p class="text-xs text-muted-foreground line-clamp-1">{progress.budget.description}</p>
								{/if}
							</div>
						</div>

						<!-- Progress -->
						<div class="mb-2">
							<div class="flex items-baseline justify-between mb-1">
								<span class="text-sm font-semibold">{formatCurrency(progress.totalSpent)}</span>
								<span class="text-xs text-muted-foreground">of {formatCurrency(progress.budget.amount)}</span>
							</div>

							<!-- Progress Bar -->
							<div class="w-full bg-muted rounded-full h-1.5 overflow-hidden">
								<div
									class="h-full transition-all duration-300 {getProgressBarColor(progress.status)}"
									style="width: {Math.min(progress.percentageUsed, 100)}%"
								></div>
							</div>

							<div class="flex items-center justify-between mt-1">
								<span class="text-xs text-muted-foreground">
									{Math.round(progress.percentageUsed)}% used
								</span>
								<span class="text-xs text-muted-foreground">
									{progress.daysRemaining} {progress.daysRemaining === 1 ? 'day' : 'days'} left
								</span>
							</div>
						</div>

						<!-- Budget Scope -->
						{#if (progress.budget.categoryNames && progress.budget.categoryNames.length > 0) || (progress.budget.templateIds && progress.budget.templateIds.length > 0) || (progress.budget.userIds && progress.budget.userIds.length > 0)}
							<div class="flex flex-wrap gap-1 mt-2">
								{#if progress.budget.categoryNames && progress.budget.categoryNames.length > 0}
									{#each progress.budget.categoryNames.slice(0, 3) as category}
										<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground">
											{category}
										</span>
									{/each}
									{#if progress.budget.categoryNames.length > 3}
										<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground">
											+{progress.budget.categoryNames.length - 3} more
										</span>
									{/if}
								{/if}
								{#if progress.budget.templateIds && progress.budget.templateIds.length > 0}
									<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground">
										{progress.budget.templateIds.length} {progress.budget.templateIds.length === 1 ? 'Template' : 'Templates'}
									</span>
								{/if}
								{#if progress.budget.userIds && progress.budget.userIds.length > 0}
									<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground">
										{progress.budget.userIds.length} {progress.budget.userIds.length === 1 ? 'Member' : 'Members'}
									</span>
								{/if}
							</div>
						{/if}

						<!-- Actions -->
						<div class="flex gap-2 mt-3">
							<Button
								variant="outline"
								size="sm"
								class="flex-1 text-xs h-7"
								onclick={() => handleViewBudgetInStats(progress.budget.id)}
							>
								View in Statistics
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</CardContent>
</Card>
