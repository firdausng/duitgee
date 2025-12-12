<script lang="ts">
	import { Card, CardContent } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";

	type Budget = {
		id: string;
		name: string;
		amount: number;
		period: 'weekly' | 'monthly' | 'custom';
		categoryNames: string[] | null;
		templateIds: string[] | null;
		userIds: string[] | null;
	};

	type Props = {
		budgets: Budget[];
		selectedBudgetId: string | null;
		onSelect: (budgetId: string | null) => void;
	};

	let { budgets, selectedBudgetId, onSelect }: Props = $props();

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

	function getBudgetScope(budget: Budget): string {
		const scopes: string[] = [];
		if (budget.categoryNames && budget.categoryNames.length > 0) {
			if (budget.categoryNames.length === 1) {
				scopes.push(budget.categoryNames[0]);
			} else {
				scopes.push(`${budget.categoryNames.length} categories`);
			}
		}
		if (budget.templateIds && budget.templateIds.length > 0) {
			scopes.push(budget.templateIds.length === 1 ? 'Template' : `${budget.templateIds.length} templates`);
		}
		if (budget.userIds && budget.userIds.length > 0) {
			scopes.push(budget.userIds.length === 1 ? 'Member' : `${budget.userIds.length} members`);
		}
		return scopes.length > 0 ? scopes.join(' • ') : 'All expenses';
	}
</script>

{#if budgets.length > 0}
	<Card class="mb-4">
		<CardContent class="py-3">
			<div class="flex items-center justify-between mb-2">
				<div class="flex items-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
						<path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
					</svg>
					<h3 class="text-sm font-semibold">Track Budget</h3>
				</div>
				{#if selectedBudgetId}
					<Button
						variant="ghost"
						size="sm"
						class="h-6 px-2 text-xs"
						onclick={() => onSelect(null)}
					>
						Clear
					</Button>
				{/if}
			</div>

			<div class="flex flex-wrap gap-2">
				{#each budgets as budget (budget.id)}
					<button
						onclick={() => onSelect(budget.id === selectedBudgetId ? null : budget.id)}
						class="inline-flex flex-col items-start px-3 py-2 rounded-md border text-sm transition-colors {budget.id === selectedBudgetId ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent border-border'}"
					>
						<span class="font-medium">{budget.name}</span>
						<span class="text-xs opacity-80">
							{formatPeriod(budget.period)} • {getBudgetScope(budget)}
						</span>
					</button>
				{/each}
			</div>
		</CardContent>
	</Card>
{/if}
