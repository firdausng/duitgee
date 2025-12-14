<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { formatCurrency } from "./utils";
	import { getBudgetStatusColor, type BudgetProgress } from "./budgetUtils";
	import { goto } from "$app/navigation";
	import AnimatedCurrency from "$lib/components/ui/animated-currency/AnimatedCurrency.svelte";

	type Props = {
		progress: BudgetProgress;
		vaultId: string;
	};

	let { progress, vaultId }: Props = $props();

	function handleEditBudget() {
		goto(`/vaults/${vaultId}/budgets/${progress.budget.id}/edit`);
	}

	const statusIcon = $derived.by(() => {
		switch (progress.status) {
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
	});

	const statusText = $derived.by(() => {
		switch (progress.status) {
			case 'under':
				return 'On Track';
			case 'warning':
				return 'Approaching Limit';
			case 'over':
				return 'Over Pace';
			case 'exceeded':
				return 'Budget Exceeded';
			default:
				return '';
		}
	});
</script>

<div  in:slide out:slide>
	<Card class="mb-4 {getBudgetStatusColor(progress.status)}">
		<CardHeader class="pb-3">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<CardTitle class="text-base flex items-center gap-2">
						<span class="xs">{statusIcon}</span>
						{progress.budget.name}
					</CardTitle>
					<p class="text-xs opacity-80 mt-1">{statusText}</p>
				</div>
				<Button
						variant="ghost"
						size="sm"
						onclick={handleEditBudget}
						class="h-7 px-2"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
						<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
					</svg>
				</Button>
			</div>
		</CardHeader>
		<CardContent class="space-y-3">
			<!-- Amount Progress -->
			<div>
				<div class="flex items-baseline justify-between mb-1">
					<AnimatedCurrency value={progress.totalSpent} />
					<AnimatedCurrency value={progress.budget.amount} />

<!--					<span class="text-md font-bold">{formatCurrency(progress.totalSpent)}</span>-->
<!--					<span class="text-sm opacity-80">of {formatCurrency(progress.budget.amount)}</span>-->
				</div>

				<!-- Progress Bar -->
				<div class="w-full bg-background/50 rounded-full h-2 overflow-hidden">
					<div
							class="h-full transition-all duration-300 {progress.status === 'exceeded' || progress.status === 'over' ? 'bg-red-500' : progress.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}"
							style="width: {Math.min(progress.percentageUsed, 100)}%"
					></div>
				</div>

				<div class="flex items-center justify-between mt-1 text-xs opacity-80">
					<span>{Math.round(progress.percentageUsed)}% used</span>
					{#if progress.remaining > 0}
						<span>{formatCurrency(progress.remaining)} remaining</span>
					{:else}
						<span>{formatCurrency(Math.abs(progress.remaining))} over</span>
					{/if}
				</div>
			</div>

			<!-- Time Progress -->
			<div class="pt-2 border-t border-current/20">
				<div class="flex items-center justify-between text-xs opacity-80 mb-1">
					<span>Day {progress.daysElapsed} of {progress.totalDays}</span>
					<span>{progress.daysRemaining} {progress.daysRemaining === 1 ? 'day' : 'days'} left</span>
				</div>

				<div class="w-full bg-background/50 rounded-full h-1.5 overflow-hidden">
					<div
							class="h-full bg-current opacity-60 transition-all duration-300"
							style="width: {(progress.daysElapsed / progress.totalDays) * 100}%"
					></div>
				</div>
			</div>

			<!-- Daily Pace -->
			<div class="pt-2 border-t border-current/20">
				<div class="grid grid-cols-2 gap-2 text-xs">
					<div>
						<p class="opacity-60 mb-0.5">Daily Pace</p>
						<p class="font-semibold">{formatCurrency(progress.dailyPace)}/day</p>
					</div>
					<div>
						<p class="opacity-60 mb-0.5">Expected by Now</p>
						<p class="font-semibold">{formatCurrency(progress.expectedSpendingByNow)}</p>
					</div>
				</div>
			</div>

			<!-- Budget Filters -->
			{#if (progress.budget.categoryNames && progress.budget.categoryNames.length > 0) || (progress.budget.templateIds && progress.budget.templateIds.length > 0) || (progress.budget.userIds && progress.budget.userIds.length > 0)}
				<div class="pt-2 border-t border-current/20">
					<p class="text-xs opacity-60 mb-1">Tracking:</p>
					<div class="flex flex-wrap gap-1">
						{#if progress.budget.categoryNames && progress.budget.categoryNames.length > 0}
							{#each progress.budget.categoryNames as category}
							<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-background/50">
								{category}
							</span>
							{/each}
						{/if}
						{#if progress.budget.templateIds && progress.budget.templateIds.length > 0}
						<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-background/50">
							{progress.budget.templateIds.length} {progress.budget.templateIds.length === 1 ? 'Template' : 'Templates'}
						</span>
						{/if}
						{#if progress.budget.userIds && progress.budget.userIds.length > 0}
						<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-background/50">
							{progress.budget.userIds.length} {progress.budget.userIds.length === 1 ? 'Member' : 'Members'}
						</span>
						{/if}
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>

