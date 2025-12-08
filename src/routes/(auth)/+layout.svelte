<script lang="ts">
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import InvitationsNotification from "$lib/components/invitations-notification.svelte";
    import {authClientBase} from "$lib/client/auth-client-base";
    import {goto} from "$app/navigation";
	import { Button } from "$lib/components/ui/button";
	import { page } from "$app/stores";
    import * as Drawer from "$lib/components/ui/drawer/index.js";
	import { Separator } from "$lib/components/ui/separator";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb";

	let { children, data } = $props();

    let authClient = authClientBase({basePath: data.basePath});
	let drawerOpen = $state(false);

	// Extract vaultId from URL if viewing a vault page
	const vaultId = $derived(() => {
		const match = $page.url.pathname.match(/\/vaults\/([^\/]+)/);
		return match ? match[1] : null;
	});

	// Get vault ID for navigation (current vault or first available)
	const navVaultId = $derived(() => {
		const current = vaultId();
		if (current && current !== 'new') return current;
		return data.vaults.length > 0 ? data.vaults[0].vaults?.id : null;
	});

	// Check if current path matches the link
	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

    async function signOut(){
        await authClient.signOut();
        await goto('/login');
    }

	function closeDrawer() {
		drawerOpen = false;
	}

	function navigateAndClose(href: string) {
		goto(href);
		closeDrawer();
	}

	// Generate breadcrumb items based on current path
	type BreadcrumbItem = {
		label: string;
		href: string;
		isCurrentPage: boolean;
		truncate?: boolean;
	};

	const breadcrumbItems = $derived(() => {
		const pathname = $page.url.pathname;
		const segments = pathname.split('/').filter(Boolean);
		const items: BreadcrumbItem[] = [];

		// Skip breadcrumb for home/root
		if (segments.length === 0) {
			return items;
		}

		// Add Home
		items.push({
			label: 'Home',
			href: '/',
			isCurrentPage: false
		});

		// Parse segments
		let vaultId: string | null = null;
		let currentSection: string | null = null;

		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];
			const isLast = i === segments.length - 1;
			const prevSegment = i > 0 ? segments[i - 1] : null;

			if (segment === 'vaults') {
				items.push({
					label: 'Vaults',
					href: '/vaults',
					isCurrentPage: isLast
				});
			} else if (prevSegment === 'vaults' && segment !== 'new') {
				// This is a vault ID
				vaultId = segment;
				const vaultData = data.vaults.find(v => v.vaults?.id === segment);
				items.push({
					label: vaultData?.vaults?.name || 'Vault',
					href: `/vaults/${segment}`,
					isCurrentPage: isLast,
					truncate: true // Enable truncation for vault names
				});
			} else if (segment === 'expenses') {
				currentSection = 'expenses';
				items.push({
					label: 'Expenses',
					href: `/vaults/${vaultId}/expenses`,
					isCurrentPage: isLast
				});
			} else if (segment === 'templates') {
				currentSection = 'templates';
				items.push({
					label: 'Templates',
					href: `/vaults/${vaultId}/templates`,
					isCurrentPage: isLast
				});
			} else if (segment === 'statistics') {
				currentSection = 'statistics';
				items.push({
					label: 'Statistics',
					href: `/vaults/${vaultId}/statistics`,
					isCurrentPage: isLast
				});
			} else if (segment === 'invitations') {
				items.push({
					label: 'Invitations',
					href: '/invitations',
					isCurrentPage: isLast
				});
			} else if (segment === 'new') {
				items.push({
					label: 'New',
					href: '#',
					isCurrentPage: isLast
				});
			} else if (segment === 'edit') {
				// For edit pages, show the ID of the resource being edited
				const resourceId = prevSegment;
				if (resourceId && resourceId !== 'expenses' && resourceId !== 'templates' && resourceId !== 'vaults') {
					// This is the resource ID before /edit
					items.push({
						label: `#${resourceId.slice(0, 8)}...`,
						href: '#',
						isCurrentPage: false
					});
				}
				items.push({
					label: 'Edit',
					href: '#',
					isCurrentPage: isLast
				});
			} else if (prevSegment === 'expenses' && segment !== 'new' && segment !== 'edit') {
				// This is an expense ID
				items.push({
					label: `#${segment.slice(0, 8)}...`,
					href: `/vaults/${vaultId}/expenses/${segment}`,
					isCurrentPage: isLast
				});
			} else if (prevSegment === 'templates' && segment !== 'new' && segment !== 'edit') {
				// This is a template ID
				items.push({
					label: `#${segment.slice(0, 8)}...`,
					href: `/vaults/${vaultId}/templates/${segment}`,
					isCurrentPage: isLast
				});
			}
		}

		return items;
	});
</script>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
			<!-- Logo -->
			<a href="/" class="flex items-center space-x-2">
				<img src="/favicon.svg" alt="DuitGee Logo" class="h-8 w-8" />
				<span class="font-bold text-xl">DuitGee</span>
			</a>

			<!-- Actions - Available on all screen sizes -->
			<div class="flex items-center gap-2">
				<InvitationsNotification />

				<!-- Drawer Menu - Available on all screen sizes -->
				<Drawer.Root bind:open={drawerOpen}>
					<Drawer.Trigger class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-2">
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

							<div class="p-4 pb-8 space-y-4">
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
												onclick={() => navigateAndClose(`/vaults/${vaultItem.vaults.id}`)}
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
											onclick={() => navigateAndClose(`/vaults/${navVaultId()}/templates`)}
											class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors {isActive(`/vaults/${navVaultId()}/templates`) ? 'bg-accent' : ''}"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
											</svg>
											Templates
										</button>
										<button
											onclick={() => navigateAndClose(`/vaults/${navVaultId()}/statistics`)}
											class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors {isActive(`/vaults/${navVaultId()}/statistics`) ? 'bg-accent' : ''}"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
											</svg>
											Statistics
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
								</div>
							</div>

							<Drawer.Footer>
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
	</header>

	<!-- Breadcrumb -->
	{#if breadcrumbItems().length > 0}
		<div class="border-b bg-background/95">
			<div class="container max-w-screen-2xl px-4 py-3">
				<Breadcrumb.Root>
					<Breadcrumb.List>
						{#each breadcrumbItems() as item, index}
							{#if index > 0}
								<Breadcrumb.Separator />
							{/if}
							<Breadcrumb.Item>
								{#if item.isCurrentPage}
									<Breadcrumb.Page class={item.truncate ? 'max-w-[150px] md:max-w-[250px] truncate' : ''}>
										{item.label}
									</Breadcrumb.Page>
								{:else}
									<Breadcrumb.Link href={item.href} class={item.truncate ? 'max-w-[150px] md:max-w-[250px] truncate inline-block' : ''}>
										{item.label}
									</Breadcrumb.Link>
								{/if}
							</Breadcrumb.Item>
						{/each}
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	<main>
		{@render children?.()}
	</main>
</div>
