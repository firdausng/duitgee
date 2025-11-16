<script lang="ts">
	import { goto } from '$app/navigation';
    import {ofetch} from "ofetch";
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { authClientBase } from "$lib/client/auth-client-base";
    import { slugify } from "$lib/utils";
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import {createVaultSchema} from "$lib/schemas/vaults";

	let { data } = $props();

    const { form, errors, enhance, delayed, validate, constraints } = superForm(data.form, {
        validators: valibotClient(createVaultSchema),
        SPA: true,
        dataType: 'json',
        onSubmit: () => {
            isSubmitting = true;
        },
        onUpdate: async ({ form }) => {
            isSubmitting = false;
            if (!form.valid) {
                return;
            }

            console.log('Form data:', form.data);

            try {
                let authClient = authClientBase({basePath: data.basePath});

                const { data: organizationList, error } = await authClient.organization.list();

                if(error){
                    console.error(error);
                    return;
                }

                if(organizationList.length === 0){
                    await authClient.organization.create({
                        name: form.data.name,
                        slug: slugify(form.data.name),
                        userId: data.currentUserId,
                    });
                }

                // Set required fields
                const vaultData = {
                    ...form.data,
                    creatorId: data.currentUserId,
                    createdBy: data.currentUserId,
                };

                const response = await ofetch<{success: boolean, data: {id: string}}>(`/api/vaults`, {
                    method: 'POST',
                    body: JSON.stringify(vaultData),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if(response.success){
                    await goto(`/vaults/${response.data.id}`);
                }
            } catch (error) {
                console.error('Error creating vault:', error);
                isSubmitting = false;
            }
        }
    });

    let isSubmitting = $state(false);

    const colorOptions = [
        { value: '#3B82F6', label: 'Blue' },
        { value: '#10B981', label: 'Green' },
        { value: '#F59E0B', label: 'Amber' },
        { value: '#EF4444', label: 'Red' },
        { value: '#8B5CF6', label: 'Purple' },
        { value: '#EC4899', label: 'Pink' },
        { value: '#06B6D4', label: 'Cyan' },
        { value: '#6366F1', label: 'Indigo' },
    ];

    const iconOptions = ['🏦', '💰', '💳', '💵', '🏢', '🏠', '🚗', '✈️', '🍔', '🎮', '📱', '🎯'];
</script>

<svelte:head>
	<title>Create New Vault - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-8 px-4 max-w-2xl">
	<!-- Header -->
	<div class="mb-8">
		<Button
			variant="ghost"
			onclick={() => goto('/vaults')}
			class="mb-4 -ml-2"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
			</svg>
			Back to Vaults
		</Button>
		<h1 class="text-3xl font-bold tracking-tight">Create New Vault</h1>
		<p class="text-muted-foreground mt-1">Set up a new vault to organize your expenses</p>
	</div>

	<!-- Form -->
	<form method="POST" use:enhance>
		<Card>
			<CardHeader>
				<CardTitle>Vault Details</CardTitle>
				<CardDescription>Enter the details for your new vault</CardDescription>
			</CardHeader>
			<CardContent class="space-y-6">
				<!-- Name Field -->
				<div class="space-y-2">
					<Label for="name">
						Vault Name <span class="text-destructive">*</span>
					</Label>
					<Input
						id="name"
						name="name"
                        aria-invalid={$errors.name ? 'true' : undefined}
						bind:value={$form.name}
                        {...$constraints.name}
						disabled={isSubmitting}
						placeholder="e.g., Personal Expenses, Work Travel"
						class={$errors.name ? 'border-destructive' : ''}
					/>
					{#if $errors.name}
						<p class="text-sm text-destructive">{$errors.name}</p>
					{/if}
				</div>

				<!-- Description Field -->
				<div class="space-y-2">
					<Label for="description">Description</Label>
					<textarea
						id="description"
						name="description"
						bind:value={$form.description}
						disabled={isSubmitting}
						placeholder="Optional description for this vault"
						rows="3"
						class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					></textarea>
					{#if $errors.description}
						<p class="text-sm text-destructive">{$errors.description}</p>
					{/if}
				</div>

				<!-- Color Picker -->
				<div class="space-y-2">
					<Label>Vault Color</Label>
					<div class="grid grid-cols-8 gap-2">
						{#each colorOptions as color}
							<button
								type="button"
								class="w-10 h-10 rounded-md border-2 transition-all hover:scale-110"
								class:ring-2={$form.color === color.value}
								class:ring-ring={$form.color === color.value}
								class:ring-offset-2={$form.color === color.value}
								style="background-color: {color.value}"
								onclick={() => $form.color = color.value}
								disabled={isSubmitting}
								aria-label={color.label}
							></button>
						{/each}
					</div>
					{#if $errors.color}
						<p class="text-sm text-destructive">{$errors.color}</p>
					{/if}
				</div>

				<!-- Icon Picker -->
				<div class="space-y-2">
					<Label>Vault Icon</Label>
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
								disabled={isSubmitting}
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

<!--				&lt;!&ndash; Vault Type Toggle &ndash;&gt;-->
<!--				<div class="space-y-2">-->
<!--					<Label>Vault Type</Label>-->
<!--					<div class="flex items-center gap-4">-->
<!--						<label class="flex items-center gap-2 cursor-pointer">-->
<!--							<input-->
<!--								type="radio"-->
<!--								name="isPublic"-->
<!--								checked={$form.isPublic === true}-->
<!--								onchange={() => $form.isPublic = true}-->
<!--								disabled={isSubmitting}-->
<!--								class="w-4 h-4 text-primary focus:ring-2 focus:ring-ring"-->
<!--							/>-->
<!--							<span class="text-sm">Public</span>-->
<!--						</label>-->
<!--						<label class="flex items-center gap-2 cursor-pointer">-->
<!--							<input-->
<!--								type="radio"-->
<!--								name="isPublic"-->
<!--								checked={$form.isPublic === false}-->
<!--								onchange={() => $form.isPublic = false}-->
<!--								disabled={isSubmitting}-->
<!--								class="w-4 h-4 text-primary focus:ring-2 focus:ring-ring"-->
<!--							/>-->
<!--							<span class="text-sm">Private</span>-->
<!--						</label>-->
<!--					</div>-->
<!--					<p class="text-xs text-muted-foreground">-->
<!--						Public vaults can be access. Shared vaults can be accessed by team members.-->
<!--					</p>-->
<!--					{#if $errors.isPublic}-->
<!--						<p class="text-sm text-destructive">{$errors.isPublic}</p>-->
<!--					{/if}-->
<!--				</div>-->
			</CardContent>
		</Card>

		<!-- Form Actions -->
		<div class="flex justify-end gap-3 mt-6">
			<Button
				type="button"
				variant="outline"
				onclick={() => goto('/vaults')}
				disabled={isSubmitting}
			>
				Cancel
			</Button>
			<Button
				type="submit"
				disabled={isSubmitting}
			>
				{#if isSubmitting}
					<svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Creating...
				{:else}
					Create Vault
				{/if}
			</Button>
		</div>
	</form>
</div>