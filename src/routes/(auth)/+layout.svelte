<script lang="ts">
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import InvitationsNotification from "$lib/components/invitations-notification.svelte";
    import {authClientBase} from "$lib/client/auth-client-base";
    import {goto} from "$app/navigation";
	import { Button } from "$lib/components/ui/button";
	import { page } from "$app/state";
    import * as Drawer from "$lib/components/ui/drawer/index.js";
	import { Separator } from "$lib/components/ui/separator";

	let { children, data } = $props();

    let authClient = authClientBase({basePath: data.basePath});
	let drawerOpen = $state(false);

	// Extract vaultId from URL if viewing a vault page
	const vaultId = $derived(() => {
		const match = page.url.pathname.match(/\/vaults\/([^\/]+)/);
		return match ? match[1] : null;
	});

	// Get vault ID for navigation (current vault or first available)
	const navVaultId = $derived(() => {
		const current = vaultId();
		if (current && current !== 'new') return current;
		return data.vaults.length > 0 ? data.vaults[0].vaults?.id : null;
	});

	// Get current search params to preserve them during navigation
	const searchParams = $derived(() => {
		const search = page.url.search;
		return search || '';
	});

	// Check if current path matches the link
	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

    async function signOut(){
        await authClient.signOut();
        await goto('/login');
    }

    let stoppingImpersonation = $state(false);
    async function stopImpersonating() {
        stoppingImpersonation = true;
        try {
            await authClient.admin.stopImpersonating();
            window.location.href = '/ops/users';
        } catch {
            stoppingImpersonation = false;
        }
    }

	function closeDrawer() {
		drawerOpen = false;
	}

	function navigateAndClose(href: string) {
		goto(href);
		closeDrawer();
	}

</script>

<div class="min-h-screen bg-background">
	{#if data.isImpersonating}
		<div class="sticky top-0 z-[60] w-full bg-amber-500/90 text-amber-950 text-sm">
			<div class="container mx-auto flex h-9 max-w-screen-2xl items-center justify-between gap-4 px-4">
				<div class="flex items-center gap-2 min-w-0">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 shrink-0"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
					<span class="truncate">
						Impersonating <strong>{data.user?.name || data.user?.email}</strong>
						{#if data.user?.email && data.user?.name}
							<span class="opacity-75">({data.user.email})</span>
						{/if}
					</span>
				</div>
				<button
					onclick={stopImpersonating}
					disabled={stoppingImpersonation}
					class="shrink-0 rounded-md bg-amber-950 text-amber-50 px-2.5 py-0.5 text-xs font-medium hover:bg-amber-900 disabled:opacity-50"
				>
					{stoppingImpersonation ? 'Stopping...' : 'Stop'}
				</button>
			</div>
		</div>
	{/if}
	<!-- Header -->
	<header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
			<!-- Logo -->
			<a href="/vaults" class="flex items-center">
				<img src="/favicon.svg" alt="DuitGee Logo" class="h-8 w-8" />
			</a>

			<!-- Vault Navigation Menu (desktop only; a mobile variant renders below the header) -->
			{#if vaultId() && vaultId() !== 'new'}
				{@const vId = vaultId()}
				{@const tabs = [
					{ href: `/vaults/${vId}`, label: 'Home', exact: true },
					{ href: `/vaults/${vId}/expenses`, label: 'Expenses' },
					{ href: `/vaults/${vId}/funds`, label: 'Funds' },
					{ href: `/vaults/${vId}/templates`, label: 'Templates' },
					{ href: `/vaults/${vId}/statistics`, label: 'Statistics' },
					{ href: `/vaults/${vId}/members`, label: 'Members' },
				]}
				<nav class="hidden md:flex gap-1 flex-1 pl-2 overflow-x-auto">
					{#each tabs as tab}
						{@const active = tab.exact ? page.url.pathname === tab.href : isActive(tab.href)}
						<a
							href="{tab.href}{searchParams()}"
							class="relative py-2 px-3 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap {active ? 'text-primary' : 'text-muted-foreground'}"
						>
							{tab.label}
							{#if active}
								<div class="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"></div>
							{/if}
						</a>
					{/each}
				</nav>
			{/if}

			<!-- Actions - Available on all screen sizes -->
			<div class="flex items-center gap-2">
				<InvitationsNotification />

				<!-- Drawer Menu - Available on all screen sizes -->
				<Drawer.Root bind:open={drawerOpen}>
					<Drawer.Trigger aria-label="Open navigation menu" title="Menu" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-2">
						<!-- Hamburger/Menu Icon -->
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
						</svg>
					</Drawer.Trigger>
					<Drawer.Content>
						<div class="mx-auto w-full max-w-sm">
							<Drawer.Header>
								<Drawer.Title>Navigation</Drawer.Title>
								<Drawer.Description>Access your vaults and settings</Drawer.Description>
							</Drawer.Header>

							<div class="p-4 space-y-4 max-h-[calc(80vh-200px)] overflow-y-auto">
								<!-- User Profile Section -->
								{#if data.user}
									<div class="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
										<div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
											{data.user.name?.charAt(0)?.toUpperCase() || data.user.email?.charAt(0)?.toUpperCase() || 'U'}
										</div>
										<div class="flex-1 min-w-0">
											<p class="font-medium text-sm truncate">{data.user.name || 'User'}</p>
											<p class="text-xs text-muted-foreground truncate">{data.user.email}</p>
										</div>
									</div>
								{/if}

								<Separator />

								<!-- Vaults Section -->
								<div>
									<div class="flex items-center justify-between mb-2">
										<h3 class="font-semibold text-sm text-muted-foreground">MY VAULTS</h3>
										<Button
											variant="ghost"
											size="sm"
											class="h-6 px-2"
											onclick={() => navigateAndClose('/vaults/new')}
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
											</svg>
										</Button>
									</div>
									<nav class="space-y-1">
										<button
											onclick={() => navigateAndClose('/vaults')}
											class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors {isActive('/vaults') && !vaultId() ? 'bg-accent' : ''}"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
											</svg>
											All Vaults
										</button>
										{#each data.vaults as vaultItem}
											<button
												onclick={() => navigateAndClose(`/vaults/${vaultItem.vaults.id}${searchParams()}`)}
												class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors {vaultId() === vaultItem.vaults.id ? 'bg-accent' : ''}"
											>
												<div
													class="w-8 h-8 rounded-full flex items-center justify-center text-lg"
													style="background-color: {vaultItem.vaults.color || '#3B82F6'}"
												>
													{vaultItem.vaults.icon || '🏦'}
												</div>
												<span class="truncate">{vaultItem.vaults.name}</span>
											</button>
										{/each}
									</nav>
								</div>

								<Separator />

								<!-- Quick Links -->
								<nav class="space-y-1">
									<button
										onclick={() => navigateAndClose('/invitations')}
										class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors {isActive('/invitations') ? 'bg-accent' : ''}"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
											<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
											<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
										</svg>
										Invitations
									</button>

									{#if navVaultId()}
										<button
											onclick={() => navigateAndClose(`/vaults/${navVaultId()}/templates${searchParams()}`)}
											class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors {isActive(`/vaults/${navVaultId()}/templates`) ? 'bg-accent' : ''}"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
											</svg>
											Templates
										</button>
										<button
											onclick={() => navigateAndClose(`/vaults/${navVaultId()}/funds${searchParams()}`)}
											class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors {isActive(`/vaults/${navVaultId()}/funds`) ? 'bg-accent' : ''}"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
												<path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" />
											</svg>
											Funds
										</button>
										<button
											onclick={() => navigateAndClose(`/vaults/${navVaultId()}/statistics${searchParams()}`)}
											class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors {isActive(`/vaults/${navVaultId()}/statistics`) ? 'bg-accent' : ''}"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
											</svg>
											Statistics
										</button>
										<button
											onclick={() => navigateAndClose(`/vaults/${navVaultId()}/members${searchParams()}`)}
											class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors {isActive(`/vaults/${navVaultId()}/members`) ? 'bg-accent' : ''}"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
											</svg>
											Members
										</button>
									{/if}
								</nav>

								<Separator />

								<!-- Settings -->
								<div class="space-y-2">
									<div class="flex items-center justify-between px-3 py-2">
										<span class="text-sm font-medium">Theme</span>
										<ThemeToggle />
									</div>

								<!-- Settings link -->
								<button
									onclick={() => navigateAndClose('/settings')}
									class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors {isActive('/settings') ? 'bg-accent' : ''}"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
									</svg>
									Settings
								</button>
								</div>
							</div>

							<Drawer.Footer class="border-t bg-background">
								<Button variant="outline" onclick={signOut} class="w-full">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
									</svg>
									Logout
								</Button>
							</Drawer.Footer>
						</div>
					</Drawer.Content>
				</Drawer.Root>

				<!-- Desktop Quick Actions -->
				<div class="hidden md:flex items-center gap-2">
					<ThemeToggle />
					<Button variant="ghost" size="sm" onclick={signOut}>
						Logout
					</Button>
				</div>
			</div>
		</div>

		<!-- Mobile vault tab row (same tabs as desktop, horizontally scrollable) -->
		{#if vaultId() && vaultId() !== 'new'}
			{@const vId = vaultId()}
			{@const mobileTabs = [
				{ href: `/vaults/${vId}`, label: 'Home', exact: true },
				{ href: `/vaults/${vId}/expenses`, label: 'Expenses' },
				{ href: `/vaults/${vId}/funds`, label: 'Funds' },
				{ href: `/vaults/${vId}/templates`, label: 'Templates' },
				{ href: `/vaults/${vId}/statistics`, label: 'Statistics' },
				{ href: `/vaults/${vId}/members`, label: 'Members' },
			]}
			<nav
				class="md:hidden flex gap-1 overflow-x-auto border-t bg-background px-2 py-1 scrollbar-hide"
				aria-label="Vault sections"
			>
				{#each mobileTabs as tab}
					{@const active = tab.exact ? page.url.pathname === tab.href : isActive(tab.href)}
					<a
						href="{tab.href}{searchParams()}"
						class="relative shrink-0 py-1.5 px-3 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap {active ? 'text-primary' : 'text-muted-foreground'}"
					>
						{tab.label}
						{#if active}
							<div class="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"></div>
						{/if}
					</a>
				{/each}
			</nav>
		{/if}
	</header>

	<!-- Main Content -->
	<main class="flex-1 overflow-x-hidden overflow-y-auto bg-background">
		{@render children?.()}
	</main>
</div>
