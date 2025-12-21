<script lang="ts">
	import { goto, afterNavigate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ofetch } from 'ofetch';
    import { resolve } from '$app/paths'

	let { data } = $props();

	let activeTab = $state<'received' | 'sent'>('received');
	let isProcessing = $state<string | null>(null);

	type Invitation = {
		id: string;
		vaultId: string;
		vaultName: string | null;
		vaultIcon: string | null;
		vaultColor: string | null;
		role: string | null;
		status: string;
		inviterId: string | null;
		inviteeId: string | null;
	};

	let receivedInvitations = $state<Invitation[]>(data.receivedInvitations);
	let sentInvitations = $state<Invitation[]>(data.sentInvitations);

	async function acceptInvitation(invitationId: string) {
		isProcessing = invitationId;
		try {
			const response = await ofetch('/api/acceptInvitation', {
				method: 'POST',
				body: { invitationId },
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.success) {
				// Remove from received list
				receivedInvitations = receivedInvitations.filter((inv) => inv.id !== invitationId);
				// Redirect to the vault
				const invitation = data.receivedInvitations.find((inv) => inv.id === invitationId);
				if (invitation) {
					await goto(`/vaults/${invitation.vaultId}`);
				}
			}
		} catch (error) {
			console.error('Failed to accept invitation:', error);
			alert('Failed to accept invitation. Please try again.');
		} finally {
			isProcessing = null;
		}
	}

	async function declineInvitation(invitationId: string) {
		isProcessing = invitationId;
		try {
			const response = await ofetch('/api/declineInvitation', {
				method: 'POST',
				body: { invitationId },
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.success) {
				// Remove from received list
				receivedInvitations = receivedInvitations.filter((inv) => inv.id !== invitationId);
			}
		} catch (error) {
			console.error('Failed to decline invitation:', error);
			alert('Failed to decline invitation. Please try again.');
		} finally {
			isProcessing = null;
		}
	}

    let previousPage : string = resolve('/vaults') ;
    afterNavigate(({from}) => {
        previousPage = from?.url.pathname || previousPage
    })

    function handleBack() {
		goto(previousPage);
	}

	function getStatusBadgeClass(status: string): string {
		switch (status) {
			case 'pending':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
			case 'accepted':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
			case 'declined':
				return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
		}
	}
</script>

<svelte:head>
	<title>Invitations - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-8 px-4">
	<!-- Header -->
	<div class="mb-6">

		<h1 class="text-2xl font-bold">Invitations</h1>
		<p class="text-sm text-muted-foreground mt-1">
			Manage your vault invitations
		</p>
	</div>

	<!-- Tabs -->
	<div class="flex gap-2 mb-6 border-b">
		<button
			class="px-4 py-2 font-medium transition-colors {activeTab === 'received'
				? 'border-b-2 border-primary text-primary'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (activeTab = 'received')}
		>
			Received ({receivedInvitations.length})
		</button>
		<button
			class="px-4 py-2 font-medium transition-colors {activeTab === 'sent'
				? 'border-b-2 border-primary text-primary'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (activeTab = 'sent')}
		>
			Sent ({sentInvitations.length})
		</button>
	</div>

	<!-- Received Invitations -->
	{#if activeTab === 'received'}
		<div class="space-y-4">
			{#if receivedInvitations.length === 0}
				<Card>
					<CardContent class="py-12">
						<div class="text-center text-muted-foreground">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-12 w-12 mx-auto mb-4 opacity-50"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
								/>
							</svg>
							<p class="text-sm">No pending invitations</p>
						</div>
					</CardContent>
				</Card>
			{:else}
				{#each receivedInvitations as invitation (invitation.id)}
					<Card>
						<CardHeader>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div
										class="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
										style="background-color: {invitation.vaultColor || '#3B82F6'}"
									>
										{invitation.vaultIcon || '🏦'}
									</div>
									<div>
										<CardTitle class="text-lg">{invitation.vaultName || 'Unknown Vault'}</CardTitle>
										<p class="text-sm text-muted-foreground">
											Role: <span class="font-medium capitalize">{invitation.role || 'member'}</span>
										</p>
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div class="flex gap-2">
								<Button
									onclick={() => acceptInvitation(invitation.id)}
									disabled={isProcessing === invitation.id}
									class="flex-1"
								>
									{isProcessing === invitation.id ? 'Accepting...' : 'Accept'}
								</Button>
								<Button
									variant="outline"
									onclick={() => declineInvitation(invitation.id)}
									disabled={isProcessing === invitation.id}
									class="flex-1"
								>
									{isProcessing === invitation.id ? 'Declining...' : 'Decline'}
								</Button>
							</div>
						</CardContent>
					</Card>
				{/each}
			{/if}
		</div>
	{/if}

	<!-- Sent Invitations -->
	{#if activeTab === 'sent'}
		<div class="space-y-4">
			{#if sentInvitations.length === 0}
				<Card>
					<CardContent class="py-12">
						<div class="text-center text-muted-foreground">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-12 w-12 mx-auto mb-4 opacity-50"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
								/>
							</svg>
							<p class="text-sm">No sent invitations</p>
						</div>
					</CardContent>
				</Card>
			{:else}
				{#each sentInvitations as invitation (invitation.id)}
					<Card>
						<CardHeader>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div
										class="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
										style="background-color: {invitation.vaultColor || '#3B82F6'}"
									>
										{invitation.vaultIcon || '🏦'}
									</div>
									<div>
										<CardTitle class="text-lg">{invitation.vaultName || 'Unknown Vault'}</CardTitle>
										<p class="text-sm text-muted-foreground">
											Role: <span class="font-medium capitalize">{invitation.role || 'member'}</span>
										</p>
									</div>
								</div>
								<span class="px-3 py-1 rounded-full text-xs font-medium {getStatusBadgeClass(invitation.status)}">
									{invitation.status}
								</span>
							</div>
						</CardHeader>
					</Card>
				{/each}
			{/if}
		</div>
	{/if}
</div>
