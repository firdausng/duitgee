<script lang="ts">
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import InvitationsNotification from "$lib/components/invitations-notification.svelte";
    import {authClientBase} from "$lib/client/auth-client-base";
    import {goto} from "$app/navigation";
	import { Button } from "$lib/components/ui/button";
	import { page } from "$app/stores";

	let { children, data } = $props();

    let authClient = authClientBase({basePath: data.basePath});
	let mobileMenuOpen = $state(false);

	// Extract vaultId from URL if viewing a vault page
	const vaultId = $derived(() => {
		const match = $page.url.pathname.match(/\/vaults\/([^\/]+)/);
		return match ? match[1] : null;
	});

    async function signOut(){
        await authClient.signOut();
        await goto('/login');
    }

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
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

			<!-- Desktop Navigation -->
			<nav class="hidden md:flex items-center gap-6 text-sm">
				<a
					href="/vaults"
					class="transition-colors hover:text-foreground/80 text-foreground"
				>
					Vaults
				</a>
				{#if vaultId()}
					<a
						href="/vaults/{vaultId()}/templates"
						class="transition-colors hover:text-foreground/80 text-foreground"
					>
						Templates
					</a>
				{/if}
			</nav>

			<!-- Desktop Actions -->
			<div class="hidden md:flex items-center gap-2">
				<InvitationsNotification />
				<ThemeToggle />
                <Button variant="ghost" size="sm" onclick={signOut}>
                    Logout
                </Button>
			</div>

			<!-- Mobile Actions -->
			<div class="flex md:hidden items-center gap-2">
				<InvitationsNotification />
				<Button variant="ghost" size="sm" onclick={toggleMobileMenu} class="px-2">
					{#if mobileMenuOpen}
						<!-- Close Icon -->
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
						</svg>
					{:else}
						<!-- Hamburger Icon -->
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
						</svg>
					{/if}
				</Button>
			</div>
		</div>

		<!-- Mobile Menu -->
		{#if mobileMenuOpen}
			<div class="md:hidden border-t">
				<nav class="container px-4 py-4 space-y-3">
					<a
						href="/vaults"
						onclick={closeMobileMenu}
						class="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent transition-colors"
					>
						Vaults
					</a>
					{#if vaultId()}
						<a
							href="/vaults/{vaultId()}/templates"
							onclick={closeMobileMenu}
							class="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent transition-colors"
						>
							Templates
						</a>
					{/if}
					<div class="flex items-center gap-2 px-3 py-2">
						<span class="text-sm text-muted-foreground mr-2">Theme:</span>
						<ThemeToggle />
					</div>
					<Button variant="outline" onclick={signOut} class="w-full">
						Logout
					</Button>
				</nav>
			</div>
		{/if}
	</header>

	<!-- Main Content -->
	<main>
		{@render children?.()}
	</main>
</div>
