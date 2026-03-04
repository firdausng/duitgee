<script lang="ts">
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import { Button } from "$lib/components/ui/button";

	let { children, data } = $props();
</script>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
			<div class="flex items-center gap-6">
				<a href="/" class="flex items-center gap-3">
					<div class="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl">
						<img src="/favicon.svg" alt="DuitGee" class="w-8 h-8" />
					</div>
					<h1 class="text-2xl font-bold text-primary">DuitGee</h1>
				</a>
			</div>
			<div class="flex items-center gap-2">
				<ThemeToggle />
				{#if data.user}
					<a href="/vaults">
						<Button variant="default" size="sm">
							Go to Vaults
						</Button>
					</a>
				{:else}
					<a href="/login">
						<Button variant="default" size="sm">
							Sign In
						</Button>
					</a>
				{/if}
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main>
		{@render children?.()}
	</main>
</div>
