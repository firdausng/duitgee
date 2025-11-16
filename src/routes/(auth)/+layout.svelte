<script lang="ts">
	import ThemeToggle from "$lib/components/theme-toggle.svelte";

	let { children } = $props();
</script>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
			<div class="flex items-center gap-6">
				<a href="/" class="flex items-center space-x-2">
					<span class="font-bold text-xl">DuitGee</span>
				</a>
				<nav class="flex items-center gap-6 text-sm">
					<a
						href="/vaults"
						class="transition-colors hover:text-foreground/80 text-foreground"
					>
						Vaults
					</a>
				</nav>
			</div>
			<div class="flex items-center gap-2">
				<ThemeToggle />
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main>
		{@render children?.()}
	</main>
</div>
