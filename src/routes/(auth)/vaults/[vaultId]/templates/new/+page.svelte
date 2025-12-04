<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { createExpenseTemplateSchema } from '$lib/schemas/expenseTemplates';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { CategoryCombobox } from '$lib/components/ui/category-combobox';
	import { MemberCombobox } from '$lib/components/ui/member-combobox';
	import { categoryData } from '$lib/configurations/categories';
    import {fail, redirect} from "@sveltejs/kit";
    import {ofetch} from "ofetch";
    import {Spinner} from "$lib/components/ui/spinner";

	let { data } = $props();

    let isLoading = $state(false)

	const { form, errors, enhance, delayed } = superForm(data.form, {
		validators: valibotClient(createExpenseTemplateSchema),
        SPA: true,
        async onUpdate({ form }) {
            console.log('Updating form', form);
            if (!form.valid) {
                throw new Error('Form is not valid');
            }

            isLoading = true;

            try {
                const response = await ofetch('/api/createExpenseTemplate', {
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
                await goto(`/vaults/${data.vaultId}/expenses/new/form?templateId=${response.data.id}`);
            } catch (error: any) {
                console.error({
                    ...error,
                    message: '[template:new:action] Failed to create template'
                });
            }finally {
                isLoading = false;
            }
        }
	});

	function handleBack() {
		goto(`/vaults/${data.vaultId}/expenses/new`);
	}

    const iconOptions = ['🏦', '💰', '💳', '💵', '🏢', '🏠', '🚗', '✈️', '🍔', '🎮', '📱', '🎯'];
</script>

<svelte:head>
	<title>New Template - DuitGee</title>
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
			Back
		</Button>

		<h1 class="text-2xl font-bold">Create Expense Template</h1>
		<p class="text-sm text-muted-foreground mt-1">
			Save time by creating templates for frequently used expenses
		</p>
	</div>

	<!-- Template Form -->
    {#if isLoading}
        <Spinner />
    {:else}
        <Card>
            <CardHeader>
                <CardTitle>Template Details</CardTitle>
                <CardDescription>
                    Set default values that will pre-populate when you use this template
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form method="POST" use:enhance class="space-y-6">
                    <!-- Hidden fields -->
                    <input type="hidden" name="vaultId" bind:value={$form.vaultId} />

                    <!-- Template Name -->
                    <div class="space-y-2">
                        <Label for="name">Template Name *</Label>
                        <Input
                                id="name"
                                name="name"
                                type="text"
                                bind:value={$form.name}
                                disabled={$delayed}
                                placeholder="e.g., Weekly Groceries, Monthly Rent"
                                class={$errors.name ? 'border-destructive' : ''}
                        />
                        {#if $errors.name}
                            <p class="text-sm text-destructive">{$errors.name}</p>
                        {/if}
                    </div>

                    <!-- Description -->
                    <div class="space-y-2">
                        <Label for="description">Description</Label>
                        <Input
                                id="description"
                                name="description"
                                type="text"
                                bind:value={$form.description}
                                disabled={$delayed}
                                placeholder="Optional description"
                                class={$errors.description ? 'border-destructive' : ''}
                        />
                        {#if $errors.description}
                            <p class="text-sm text-destructive">{$errors.description}</p>
                        {/if}
                    </div>

                    <!-- Icon Picker -->
                    <div class="space-y-2">
                        <Label>Icon</Label>
                        <div class="grid grid-cols-6 sm:grid-cols-12 gap-2">
                            {#each iconOptions as iconOption}
                                <button
                                        type="button"
                                        class="w-10 h-10 text-2xl rounded-md border-2 transition-all hover:scale-110 flex items-center justify-center"
                                        class:ring-2={$form.icon === iconOption}
                                        class:ring-ring={$form.icon === iconOption}
                                        class:ring-offset-2={$form.icon === iconOption}
                                        class:border-primary={$form.icon === iconOption}
                                        onclick={() => $form.icon = iconOption}
                                        disabled={isLoading}
                                        aria-label={`Icon ${iconOption}`}
                                >
                                    {iconOption}
                                </button>
                            {/each}
                        </div>
                        {#if $errors.icon}
                            <p class="text-sm text-destructive">{$errors.icon}</p>
                        {/if}
                    </div>

                    <!-- Icon -->
<!--                    <div class="space-y-2">-->
<!--                        <Label for="icon">Icon</Label>-->
<!--                        <Input-->
<!--                                id="icon"-->
<!--                                name="icon"-->
<!--                                type="text"-->
<!--                                bind:value={$form.icon}-->
<!--                                disabled={$delayed}-->
<!--                                placeholder="📝"-->
<!--                                class={$errors.icon ? 'border-destructive' : ''}-->
<!--                        />-->
<!--                        {#if $errors.icon}-->
<!--                            <p class="text-sm text-destructive">{$errors.icon}</p>-->
<!--                        {/if}-->
<!--                        <p class="text-xs text-muted-foreground">Enter an emoji to represent this template</p>-->
<!--                    </div>-->

                    <div class="border-t pt-6">
                        <h3 class="font-semibold mb-4">Default Expense Values</h3>
                        <p class="text-sm text-muted-foreground mb-4">
                            These values will pre-fill when you create an expense from this template
                        </p>

                        <div class="space-y-4">
                            <!-- Default Amount -->
                            <div class="space-y-2">
                                <Label for="defaultAmount">Default Amount</Label>
                                <Input
                                        id="defaultAmount"
                                        name="defaultAmount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        bind:value={$form.defaultAmount}
                                        disabled={$delayed}
                                        placeholder="0.00"
                                        class={$errors.defaultAmount ? 'border-destructive' : ''}
                                />
                                {#if $errors.defaultAmount}
                                    <p class="text-sm text-destructive">{$errors.defaultAmount}</p>
                                {/if}
                            </div>

                            <!-- Default Note -->
                            <div class="space-y-2">
                                <Label for="defaultNote">Default Description</Label>
                                <Input
                                        id="defaultNote"
                                        name="defaultNote"
                                        type="text"
                                        bind:value={$form.defaultNote}
                                        disabled={$delayed}
                                        placeholder="Default note for this expense"
                                        class={$errors.defaultNote ? 'border-destructive' : ''}
                                />
                                {#if $errors.defaultNote}
                                    <p class="text-sm text-destructive">{$errors.defaultNote}</p>
                                {/if}
                            </div>

                            <!-- Default Category -->
                            <CategoryCombobox
                                    name="defaultCategoryName"
                                    label="Default Category"
                                    categories={categoryData.categories}
                                    bind:value={$form.defaultCategoryName}
                                    disabled={$delayed}
                                    error={$errors.defaultCategoryName}
                                    required={false}
                            />

                            <!-- Default Paid By -->
                            <MemberCombobox
                                    name="defaultPaidBy"
                                    label="Default Paid By"
                                    members={data.members}
                                    bind:value={$form.defaultPaidBy}
                                    disabled={$delayed}
                                    error={$errors.defaultPaidBy}
                                    required={false}
                                    allowEmpty={true}
                                    emptyLabel="Vault-level expense (no specific person)"
                                    allowCreator={true}
                                    creatorLabel="Expense Creator"
                            />
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-3 pt-4">
                        <Button type="submit" disabled={$delayed} class="flex-1">
                            {#if $delayed}
                                Creating...
                            {:else}
                                Create Template
                            {/if}
                        </Button>
                        <Button type="button" variant="outline" onclick={handleBack} disabled={$delayed}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    {/if}


</div>
