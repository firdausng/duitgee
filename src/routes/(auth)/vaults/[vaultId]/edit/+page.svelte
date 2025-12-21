<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { IconCombobox } from '$lib/components/ui/icon-combobox';
	import { ofetch } from 'ofetch';
	import { Spinner } from '$lib/components/ui/spinner';
    import {updateVaultRequestSchema} from "$lib/schemas/vaults";
    import {Checkbox} from "$lib/components/ui/checkbox";
    import { iconData } from '$lib/configurations/icons';
    import { localeOptions, currencyOptions, getDefaultCurrency } from '$lib/configurations/locales';

	let { data } = $props();

	let isLoading = $state(false);
	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);

	const { form, errors, enhance, delayed, constraints } = superForm(data.form, {
		validators: valibotClient(updateVaultRequestSchema),
		SPA: true,
		async onUpdate({ form }) {
			if (!form.valid) {
				throw new Error('Form is not valid');
			}

			isLoading = true;

			try {
				const response = await ofetch('/api/updateVault', {
					method: 'POST',
					body: form.data,
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (response.success === false) {
					throw new Error('Failed to update vault');
				}

				// Redirect back to vault
				await goto(`/vaults/${data.vaultId}`);
			} catch (error: any) {
				console.error({
					...error,
					message: '[vault:edit:action] Failed to update vault'
				});
			} finally {
				isLoading = false;
			}
		}
	});

	function handleBack() {
		goto(`/vaults/${data.vaultId}`);
	}

	async function handleDelete() {
		if (!showDeleteConfirm) {
			showDeleteConfirm = true;
			return;
		}

		isDeleting = true;

		try {
			const response = await ofetch('/api/deleteVault', {
				method: 'POST',
				body: {
					id: data.vaultId,
				},
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.success === false) {
				throw new Error('Failed to delete expense');
			}

			// Redirect back to vault
			await goto(`/vaults/${data.vaultId}`);
		} catch (error: any) {
			console.error({
				...error,
				message: '[vault:edit:delete] Failed to delete vault'
			});
		} finally {
			isDeleting = false;
			showDeleteConfirm = false;
		}
	}

	function cancelDelete() {
		showDeleteConfirm = false;
	}

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
	<title>Edit Vault - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-8 px-4">
	<!-- Expense Form -->
	{#if isLoading || isDeleting}
		<Spinner />
	{:else}
		<Card>
			<CardHeader>
				<CardTitle>Vault Details</CardTitle>
				<CardDescription>
					Update the vault information
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form method="POST" use:enhance class="space-y-6">
					<!-- Hidden fields -->
					<input type="hidden" name="id" bind:value={$form.id} />

                    <!-- isDefault Field -->
                    <div class="space-y-2 flex items-center gap-3">
                        <Checkbox id="isDefault"
                                  name="isDefault"
                                  aria-invalid={$errors.isDefault ? 'true' : undefined}
                                  bind:checked={$form.isDefault}
                                  {...$constraints.isDefault}
                                  disabled={isLoading}
                                  class={$errors.isDefault ? 'border-destructive' : ''}

                        />
                        <div class="grid gap-2">
                            <Label for="terms-2">Set this as default vault</Label>
                            <p class="text-muted-foreground text-sm">
                                By clicking this checkbox, this vault will be opened automatically when you open the app.
                            </p>
                        </div>
                        {#if $errors.isDefault}
                            <p class="text-sm text-destructive">{$errors.isDefault}</p>
                        {/if}
                    </div>

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
                                disabled={isLoading}
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
                                disabled={isLoading}
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
                                        disabled={isLoading}
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
                        disabled={isLoading}
                        error={$errors.icon}
                        required={false}
                        placeholder="Search icons..."
                    />

					<!-- Locale Selection -->
					<div class="space-y-2">
						<Label for="locale">Language & Region</Label>
						<select
							id="locale"
							name="locale"
							bind:value={$form.locale}
							disabled={isLoading}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							onchange={() => {
								// Auto-update currency when locale changes
								if ($form.locale) {
									$form.currency = getDefaultCurrency($form.locale);
								}
							}}
						>
							{#each localeOptions as locale}
								<option value={locale.value}>{locale.label}</option>
							{/each}
						</select>
						<p class="text-xs text-muted-foreground">
							Determines date, time, and number formatting in this vault
						</p>
						{#if $errors.locale}
							<p class="text-sm text-destructive">{$errors.locale}</p>
						{/if}
					</div>

					<!-- Currency Selection -->
					<div class="space-y-2">
						<Label for="currency">Currency</Label>
						<select
							id="currency"
							name="currency"
							bind:value={$form.currency}
							disabled={isLoading}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#each currencyOptions as currency}
								<option value={currency.value}>{currency.label}</option>
							{/each}
						</select>
						<p class="text-xs text-muted-foreground">
							Currency used for expense amounts and reports
						</p>
						{#if $errors.currency}
							<p class="text-sm text-destructive">{$errors.currency}</p>
						{/if}
					</div>

					<!-- Actions -->
					<div class="space-y-3 pt-4">
						<div class="flex gap-3">
							<Button type="submit" disabled={$delayed} class="flex-1">
								{#if $delayed}
									Updating...
								{:else}
									Update Vault
								{/if}
							</Button>
							<Button type="button" variant="outline" onclick={handleBack} disabled={$delayed}>
								Cancel
							</Button>
						</div>

						<!-- Delete Section -->
						{#if showDeleteConfirm}
							<div class="border border-destructive rounded-lg p-4 space-y-3">
								<p class="text-sm text-destructive font-medium">
									Are you sure you want to delete this expense? This action cannot be undone.
								</p>
								<div class="flex gap-2">
									<Button
										type="button"
										variant="destructive"
										onclick={handleDelete}
										disabled={isDeleting}
										class="flex-1"
									>
										{#if isDeleting}
											Deleting...
										{:else}
											Confirm Delete
										{/if}
									</Button>
									<Button
										type="button"
										variant="outline"
										onclick={cancelDelete}
										disabled={isDeleting}
									>
										Cancel
									</Button>
								</div>
							</div>
						{:else}
							<Button
								type="button"
								variant="outline"
								onclick={handleDelete}
								class="w-full text-destructive hover:text-destructive"
							>
								Delete Expense
							</Button>
						{/if}
					</div>
				</form>
			</CardContent>
		</Card>
	{/if}
</div>
