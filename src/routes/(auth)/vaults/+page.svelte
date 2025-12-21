<script lang="ts">
    import {goto} from "$app/navigation";
    import {ofetch} from "ofetch";
    import {onMount} from "svelte";
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import type {VaultWithMember} from "$lib/schemas/read/vaultWithMember";

	let { data } = $props();

	// View mode state
	let viewMode = $state('list'); // 'grid' or 'list'

	const currentUser = data.activeUser;
    let vaultsList = $state<VaultWithMember[]>([]);
    let isLoading = $state(true);

    onMount(async()=>{
        try {
            const response = await ofetch<{success: boolean, data: VaultWithMember[]}>(`/api/getVaults`);
            vaultsList = response.data || [];
        } catch (error) {
            console.error('Failed to fetch vaults:', error);
            vaultsList = [];
        } finally {
            isLoading = false;
        }
    });


	function handleEditVault(vaultId: string) {
		goto(`/vaults/${vaultId}/edit`);
	}

	async function handleDeleteVault(vaultId: string) {
		if (confirm('Are you sure you want to delete this vault? This action cannot be undone.')) {
            try {
                await ofetch(`/api/deleteVault`, {
                    method: 'POST',
                    body: JSON.stringify({ id: vaultId }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                // Refresh vaults list
                const response = await ofetch<{success: boolean, data: VaultWithMember[]}>(`/api/getVaults`);
                vaultsList = response.data || [];
            } catch (error) {
                console.error('Failed to delete vault:', error);
                alert('Failed to delete vault. Please try again.');
            }
		}
	}

	function handleManageMembers(vaultId: string) {
		goto(`/vaults/${vaultId}/members`);
	}

    function handleCreateVault() {
        goto('/vaults/new');
    }

    function handleViewVault(vaultId: string) {
        goto(`/vaults/${vaultId}`);
    }

    async function handleSetDefaultVault(vaultId: string, event: Event) {
        event.stopPropagation();

        try {
            await ofetch('/api/setDefaultVault', {
                method: 'POST',
                body: JSON.stringify({ vaultId }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Refresh vaults list to update the UI
            const response = await ofetch<{success: boolean, data: VaultWithMember[]}>(`/api/getVaults`);
            vaultsList = response.data || [];
        } catch (error) {
            console.error('Failed to set default vault:', error);
            alert('Failed to set default vault. Please try again.');
        }
    }

</script>

<svelte:head>
	<title>Vaults - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Vaults</h1>
			<p class="text-muted-foreground mt-1">Manage your expense vaults</p>
		</div>
		{#if !isLoading && vaultsList.length > 0}
			<Button onclick={handleCreateVault}>
				Create Vault
			</Button>
		{/if}
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-16">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
			<p class="mt-4 text-muted-foreground">Loading vaults...</p>
		</div>
	{:else if vaultsList.length === 0}
		<!-- Empty State -->
		<Card class="border-dashed">
			<CardContent class="flex flex-col items-center justify-center py-16 px-4">
				<div class="rounded-full bg-primary/10 p-6 mb-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-12 w-12 text-primary"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
				</div>
				<h2 class="text-2xl font-semibold mb-2">No vaults yet</h2>
				<p class="text-muted-foreground text-center max-w-md mb-6">
					Create your first vault to start tracking expenses. Vaults help you organize expenses by project, category, or team.
				</p>
				<Button onclick={handleCreateVault} size="lg">
					Create Your First Vault
				</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- Vaults List -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each vaultsList as vaultItem (vaultItem.vaults.id)}
				<Card class="hover:shadow-lg transition-shadow cursor-pointer" onclick={() => handleViewVault(vaultItem.vaults.id)}>
					<CardHeader>
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								<div
									class="text-3xl w-12 h-12 rounded-lg flex items-center justify-center"
									style="background-color: {vaultItem.vaults.color}20;"
								>
									{vaultItem.vaults.icon || '🏦'}
								</div>
								<div>
									<CardTitle class="text-xl">{vaultItem.vaults.name}</CardTitle>
									{#if vaultItem.vaults.description}
										<CardDescription class="mt-1">{vaultItem.vaults.description}</CardDescription>
									{/if}
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div class="flex items-center justify-between text-sm text-muted-foreground">
							<div class="flex items-center gap-2">
								<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
										<path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
									</svg>
									{vaultItem.vaultMembers.role}
								</span>
								{#if vaultItem.vaultMembers.isDefault}
									<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
										</svg>
										Default
									</span>
								{/if}
							</div>
							<div class="flex gap-1">
								<button
									class="p-1.5 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-md transition-colors {vaultItem.vaultMembers.isDefault ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}"
									onclick={(e) => handleSetDefaultVault(vaultItem.vaults.id, e)}
									aria-label={vaultItem.vaultMembers.isDefault ? 'Unset as default vault' : 'Set as default vault'}
									title={vaultItem.vaultMembers.isDefault ? 'Unset as default vault' : 'Set as default vault'}
								>
									{#if vaultItem.vaultMembers.isDefault}
										<!-- Filled star for default vault -->
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
										</svg>
									{:else}
										<!-- Outline star for non-default vault -->
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
										</svg>
									{/if}
								</button>
								<button
									class="p-1.5 hover:bg-accent rounded-md transition-colors"
									onclick={(e) => {
										e.stopPropagation();
										handleEditVault(vaultItem.vaults.id);
									}}
									aria-label="Edit vault"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
										<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
									</svg>
								</button>
								<button
									class="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
									onclick={(e) => {
										e.stopPropagation();
										handleDeleteVault(vaultItem.vaults.id);
									}}
									aria-label="Delete vault"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
									</svg>
								</button>
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>
