<script lang="ts">
	import { goto } from "$app/navigation";
	import { useSearchParams } from "runed/kit";
	import { ofetch } from "ofetch";
	import { resource } from "runed";
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
	import { localDatetimeToUtcIso, getDateRange, type DateFilter } from "$lib/utils";
	import { createVaultFormatters } from "$lib/vaultFormatting";
	import { scale } from "svelte/transition";
	import { filterSchema } from "./schemas";

	let { data } = $props();
	let { vaultId, vault } = data;

	// Create vault-specific formatters
	const fmt = createVaultFormatters({
		locale: vault?.locale || 'en-US',
		currency: vault?.currency || 'USD'
	});

	type Expense = {
		id: string;
		vaultId: string;
		note: string | null;
		amount: number;
		paymentType: string;
		category: {
			name: string;
			description: string;
			icon: string;
			iconType: string;
			color: string;
			isPublic: boolean;
			group: string;
		};
		paidBy: string | null;
		paidByName: string | null;
		date: string;
		createdAt: string | null;
		createdBy: string;
		updatedAt: string | null;
		updatedBy: string | null;
		deletedAt: string | null;
		deletedBy: string | null;
	};

	const params = useSearchParams(filterSchema);

	// Refetch key to trigger data reload
	let refetchKey = $state(0);

	// Filter state
	let filterType = $derived(params.filter as DateFilter);

	function getDateRangeWithCustom(): { startDate?: string; endDate?: string } {
		if (filterType === 'custom' && params.startDate && params.endDate) {
			return {
				startDate: localDatetimeToUtcIso(params.startDate),
				endDate: localDatetimeToUtcIso(params.endDate)
			};
		}
		return getDateRange(filterType);
	}

	// Resource for expenses
	const expensesResource = resource(
		() => [vaultId, filterType, params.startDate, params.endDate, refetchKey] as const,
		async ([id, filter, startDate, endDate]) => {
			const dateRange = getDateRangeWithCustom();
			const urlParams = new URLSearchParams({
				vaultId: id,
				page: '1',
				limit: '100'
			});

			if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
			if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);

			const response = await ofetch<{ expenses: Expense[]; pagination: any }>(
				`/api/getExpenses?${urlParams.toString()}`
			);
			return response.expenses || [];
		}
	);

	const expenses = $derived(expensesResource.current || []);
	const isLoading = $derived(expensesResource.loading);

	const filterTitle = $derived(() => {
		switch (filterType) {
			case 'today':
				return 'Expenses for today';
			case 'week':
				return 'Expenses for this week';
			case 'month':
				return 'Expenses for this month';
			case 'year':
				return 'Expenses for this year';
			case 'custom':
				return 'Expenses in selected date range';
			default:
				return 'All expenses';
		}
	});

	function handleCreateExpense() {
		goto(`/vaults/${vaultId}/expenses/new`);
	}

	function handleEditExpense(expenseId: string) {
		goto(`/vaults/${vaultId}/expenses/${expenseId}/edit`);
	}

	async function handleDeleteExpense(expenseId: string) {
		if (!confirm('Are you sure you want to delete this expense?')) return;

		try {
			await ofetch('/api/deleteExpense', {
				method: 'POST',
				body: JSON.stringify({ id: expenseId, vaultId }),
				headers: { 'Content-Type': 'application/json' }
			});

			refetchKey++;
		} catch (error) {
			console.error('Failed to delete expense:', error);
			alert('Failed to delete expense. Please try again.');
		}
	}

	function formatTime(dateString: string): string {
		return new Date(dateString).toLocaleTimeString(fmt.getLocale(), {
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Expenses - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-4 md:py-8 px-4">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4 md:mb-6">
		<div>
			<h1 class="text-2xl md:text-3xl font-bold">Expenses</h1>
			<p class="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">Manage all your expenses</p>
		</div>
		<Button onclick={handleCreateExpense} size="sm" class="md:h-10">
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
			<span class="hidden md:inline">Add Expense</span>
		</Button>
	</div>

	<!-- Filters -->
	<Card class="mb-4 md:mb-6">
		<CardContent class="py-3 md:py-4">
			<div class="flex flex-wrap gap-1.5 md:gap-2">
				<Button
					variant={filterType === 'all' ? 'default' : 'outline'}
					size="sm"
					class="text-xs md:text-sm h-8 md:h-9"
					onclick={() => (params.filter = 'all')}
				>
					All
				</Button>
				<Button
					variant={filterType === 'today' ? 'default' : 'outline'}
					size="sm"
					class="text-xs md:text-sm h-8 md:h-9"
					onclick={() => (params.filter = 'today')}
				>
					Today
				</Button>
				<Button
					variant={filterType === 'week' ? 'default' : 'outline'}
					size="sm"
					class="text-xs md:text-sm h-8 md:h-9"
					onclick={() => (params.filter = 'week')}
				>
					<span class="hidden sm:inline">This </span>Week
				</Button>
				<Button
					variant={filterType === 'month' ? 'default' : 'outline'}
					size="sm"
					class="text-xs md:text-sm h-8 md:h-9"
					onclick={() => (params.filter = 'month')}
				>
					<span class="hidden sm:inline">This </span>Month
				</Button>
				<Button
					variant={filterType === 'year' ? 'default' : 'outline'}
					size="sm"
					class="text-xs md:text-sm h-8 md:h-9"
					onclick={() => (params.filter = 'year')}
				>
					<span class="hidden sm:inline">This </span>Year
				</Button>
			</div>
		</CardContent>
	</Card>

	<!-- Expenses List -->
	<Card>
		<CardHeader>
			<CardTitle>Expenses</CardTitle>
			<CardDescription>{filterTitle()}</CardDescription>
		</CardHeader>
		<CardContent>
			{#if isLoading}
				<div class="flex justify-center py-8 md:py-12">
					<div class="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-primary"></div>
				</div>
			{:else if expenses.length === 0}
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
							d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"
						/>
					</svg>
					<p class="text-base md:text-lg text-muted-foreground mb-3 md:mb-4">No expenses yet</p>
					<Button onclick={handleCreateExpense} size="sm" class="md:h-10">Create your first expense</Button>
				</div>
			{:else}
				<div class="space-y-2 md:space-y-3" in:scale={{ start: 0.95, duration: 400 }}>
					{#each expenses as expense (expense.id)}
						<div class="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow bg-card">
							<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
								<!-- Content Section -->
								<div class="flex-1 min-w-0">
									<!-- Amount and Date - Mobile: Stacked, Desktop: Side by side -->
									<div class="flex items-start justify-between gap-2 mb-2">
										<div class="text-xl md:text-2xl font-bold text-primary">
											{fmt.currency(expense.amount)}
										</div>
										<div class="text-xs md:text-sm text-muted-foreground text-right shrink-0">
											<div>{fmt.date(expense.date)}</div>
											<div class="text-[10px] md:text-xs">{formatTime(expense.date)}</div>
										</div>
									</div>

									<!-- Description -->
									{#if expense.note}
										<div class="text-sm md:text-base font-medium mb-2 line-clamp-2">
											{expense.note}
										</div>
									{/if}

									<!-- Category and Paid By -->
									<div class="flex flex-wrap items-center gap-1.5 md:gap-2">
										{#if expense.category?.name}
											<span
												class="inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-1 rounded-md bg-primary/10 text-primary text-xs md:text-sm font-medium"
											>
												<span class="text-sm md:text-base">{expense.category.icon}</span>
												<span class="ml-1">{expense.category.name}</span>
											</span>
										{:else}
											<span
												class="inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-1 rounded-md bg-destructive/10 text-destructive text-xs md:text-sm font-medium"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="h-3 w-3 md:h-4 md:w-4 mr-1"
													viewBox="0 0 20 20"
													fill="currentColor"
												>
													<path
														fill-rule="evenodd"
														d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
														clip-rule="evenodd"
													/>
												</svg>
												Invalid
											</span>
										{/if}
										{#if expense.paidBy && expense.paidByName}
											<span class="text-xs md:text-sm text-muted-foreground truncate">
												<span class="hidden md:inline">Paid by: </span>
												<span class="font-medium">{expense.paidByName}</span>
											</span>
										{/if}
									</div>
								</div>

								<!-- Actions Section - Mobile: Icon only, Desktop: With text -->
								<div class="flex gap-1.5 md:gap-2 shrink-0 self-end md:self-start">
									<Button
										variant="outline"
										size="sm"
										class="h-8 md:h-9 w-8 md:w-auto p-0 md:px-3"
										onclick={() => handleEditExpense(expense.id)}
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
										onclick={() => handleDeleteExpense(expense.id)}
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