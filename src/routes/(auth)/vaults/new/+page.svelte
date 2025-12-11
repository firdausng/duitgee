<script lang="ts">
	import { goto } from '$app/navigation';
    import {ofetch} from "ofetch";
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { IconCombobox } from '$lib/components/ui/icon-combobox';
    import {createVaultSchema} from "$lib/schemas/vaults";
    import { iconData } from '$lib/configurations/icons';
    import { Toaster } from "$lib/components/ui/sonner";
    import { toast } from "svelte-sonner";

	let { data } = $props();

    const { form, errors, enhance, constraints } = superForm(data.form, {
        validators: valibotClient(createVaultSchema),
        SPA: true,
        dataType: 'json',
        onSubmit: () => {
            isSubmitting = true;
        },
        onUpdate: async ({ form }) => {
            isSubmitting = false;
            if (!form.valid) {
                toast.error('Please fill in all required fields correctly');
                return;
            }

            try {
                // Set required fields
                const vaultData = {
                    ...form.data,
                    creatorId: data.currentUserId,
                    createdBy: data.currentUserId,
                };

                const response = await ofetch<{success: boolean, data: {vault: {id: string}}, error?: string}>(`/api/createVault`, {
                    method: 'POST',
                    body: JSON.stringify(vaultData),
                    headers: {
                        'Content-Type': 'application/json'
                    },
					async onResponseError({ request, response, options }) {
						// Log error
						console.error(
								"[fetch response error]",
								request,
								response.status,
								response.body
						);
						// alert(JSON.stringify(response, null, 2));
						toast.error(response._data.error || 'Failed to create vault');
					},
                });

                if (response.success === false) {
                    toast.error(response.error || 'Failed to create vault');
                    isSubmitting = false;
                    return;
                }

                toast.success('Vault created successfully');
                await goto(`/vaults/${response.data.vault.id}`);
            } catch (error: any) {
				// alert(JSON.stringify(error, null, 2));
                // console.error('Error creating vault:', error);
                // const errorMessage = error?.data?.error || error?.body?.message || error?.message || 'Failed to create vault. Please try again.';
                // toast.error(errorMessage);
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
</script>

<svelte:head>
	<title>Create New Vault - DuitGee</title>
</svelte:head>

<Toaster />

<div class="container mx-auto py-8 px-4 max-w-2xl">
	<!-- Header -->
	<div class="mb-8">
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

				<!-- Icon -->
				<IconCombobox
					name="icon"
					label="Vault Icon"
					icons={iconData.icons}
					bind:value={$form.icon}
					disabled={isSubmitting}
					error={$errors.icon}
					required={false}
					placeholder="Search icons..."
				/>

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