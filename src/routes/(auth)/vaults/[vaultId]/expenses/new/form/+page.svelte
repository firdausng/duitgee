<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { createExpenseSchema } from '$lib/schemas/expenses';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { CategoryCombobox } from '$lib/components/ui/category-combobox';
	import { MemberCombobox } from '$lib/components/ui/member-combobox';
	import { categoryData } from '$lib/configurations/categories';

	let { data } = $props();

	const { form, errors, enhance, delayed } = superForm(data.form, {
		validators: valibotClient(createExpenseSchema)
	});

	function handleBack() {
		goto(`/vaults/${data.vaultId}`);
	}
</script>

<svelte:head>
	<title>New Expense - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-8 px-4 max-w-2xl">
	<!-- Header -->
	<div class="mb-6">
		<Button variant="ghost" onclick={handleBack} class="mb-4 -ml-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4 mr-2"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
					clip-rule="evenodd"
				/>
			</svg>
			Back to Vault
		</Button>

		<h1 class="text-2xl font-bold">
			{#if data.template}
				Create Expense from "{data.template.name}"
			{:else}
				Create Expense
			{/if}
		</h1>
		{#if data.template?.description}
			<p class="text-sm text-muted-foreground mt-1">{data.template.description}</p>
		{/if}
	</div>

	<!-- Expense Form -->
	<Card>
		<CardHeader>
			<CardTitle>Expense Details</CardTitle>
		</CardHeader>
		<CardContent>
			<form method="POST" use:enhance class="space-y-6">
				<!-- Hidden fields -->
				<input type="hidden" name="vaultId" bind:value={$form.vaultId} />
				{#if $form.templateId}
					<input type="hidden" name="templateId" bind:value={$form.templateId} />
				{/if}

				<!-- Amount -->
				<div class="space-y-2">
					<Label for="amount">Amount *</Label>
					<Input
						id="amount"
						name="amount"
						type="number"
						step="0.01"
						min="0"
						bind:value={$form.amount}
						disabled={$delayed}
						class={$errors.amount ? 'border-destructive' : ''}
					/>
					{#if $errors.amount}
						<p class="text-sm text-destructive">{$errors.amount}</p>
					{/if}
				</div>

				<!-- Note -->
				<div class="space-y-2">
					<Label for="note">Description</Label>
					<Input
						id="note"
						name="note"
						type="text"
						bind:value={$form.note}
						disabled={$delayed}
						placeholder="What was this expense for?"
						class={$errors.note ? 'border-destructive' : ''}
					/>
					{#if $errors.note}
						<p class="text-sm text-destructive">{$errors.note}</p>
					{/if}
				</div>

				<!-- Category -->
				<CategoryCombobox
					name="categoryName"
					label="Category"
					categories={categoryData.categories}
					bind:value={$form.categoryName}
					disabled={$delayed}
					error={$errors.categoryName}
					required={true}
				/>

				<!-- Paid By -->
				<MemberCombobox
					name="paidBy"
					label="Paid By"
					members={data.members}
					bind:value={$form.paidBy}
					disabled={$delayed}
					error={$errors.paidBy}
					required={false}
					allowEmpty={true}
					emptyLabel="Vault-level expense (no specific person)"
				/>

				<!-- Date -->
				<div class="space-y-2">
					<Label for="date">Date *</Label>
					<Input
						id="date"
						name="date"
						type="date"
						bind:value={$form.date}
						disabled={$delayed}
						class={$errors.date ? 'border-destructive' : ''}
					/>
					{#if $errors.date}
						<p class="text-sm text-destructive">{$errors.date}</p>
					{/if}
				</div>

				<!-- Actions -->
				<div class="flex gap-3 pt-4">
					<Button type="submit" disabled={$delayed} class="flex-1">
						{#if $delayed}
							Creating...
						{:else}
							Create Expense
						{/if}
					</Button>
					<Button type="button" variant="outline" onclick={handleBack} disabled={$delayed}>
						Cancel
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
