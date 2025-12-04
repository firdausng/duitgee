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
	import { FloatingActionButton } from '$lib/components/ui/floating-action-button';
	import { categoryData } from '$lib/configurations/categories';
    import {ofetch} from "ofetch";

	let { data } = $props();
    let isLoading = $state(false)
	let formElement: HTMLFormElement | undefined = $state();

    console.log(data.form)
	const { form, errors, enhance, delayed } = superForm(data.form, {
		validators: valibotClient(createExpenseSchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                throw new Error('Form is not valid');
            }

            isLoading = true;

            try {
                const response = await ofetch('/api/createExpense', {
                    method: 'POST',
                    body: form.data,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.success === false) {
                    throw new Error('Failed to create template');
                }

                // console.log(response, params)

                // Redirect back to the expense creation flow
                await goto(`/vaults/${data.vaultId}`);
            } catch (error: any) {
                console.error({
                    ...error,
                    message: '[expense:new:action] Failed to create expense'
                });
            }finally {
                isLoading = false;
            }
        }
	});

	function handleBack() {
		goto(`/vaults/${data.vaultId}`);
	}

	function handleSubmit() {
		if (formElement) {
			formElement.requestSubmit();
		}
	}

    function formatDateForInput(date: Date | string): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // Set default date to current date and time
    if (!$form.date) {
        $form.date = formatDateForInput(new Date());
    } else {
        $form.date = formatDateForInput($form.date);
    }
</script>

<svelte:head>
	<title>New Expense - DuitGee</title>
</svelte:head>

<div class="relative min-h-screen flex flex-col">
	<div class="container mx-auto py-8 px-4 max-w-2xl flex-1">
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
				Expense created from
                <span class="text-sky-500"><a href="/vaults/{data.vaultId}/templates/{data.template.id}/edit">{data.template.icon} {data.template.name}</a></span>
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
			<form bind:this={formElement} method="POST" use:enhance class="space-y-6">
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

				<!-- Date and Time -->
				<div class="space-y-2">
					<Label for="date">Date & Time *</Label>
					<Input
						id="date"
						name="date"
						type="datetime-local"
						bind:value={$form.date}
						disabled={$delayed}
						class={$errors.date ? 'border-destructive' : ''}
					/>
					{#if $errors.date}
						<p class="text-sm text-destructive">{$errors.date}</p>
					{/if}
				</div>

				<!-- Actions - Hidden on mobile, shown on desktop -->
				<div class="hidden sm:flex gap-3 pt-4">
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

				<!-- Mobile: Add bottom padding to account for FAB -->
				<div class="sm:hidden pb-24"></div>
			</form>
		</CardContent>
	</Card>
	</div>

	<!-- Floating Action Button - Mobile only -->
	<FloatingActionButton onclick={handleSubmit} disabled={$delayed || isLoading} class="sm:hidden">
	{#snippet icon()}
		{#if $delayed || isLoading}
			<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
				<path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" />
			</svg>
		{/if}
	{/snippet}
	{#if $delayed || isLoading}
		Creating...
	{:else}
		Create
	{/if}
</FloatingActionButton>
</div>
