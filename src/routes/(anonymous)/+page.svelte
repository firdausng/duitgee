<script lang="ts">
	import { Button } from "$lib/components/ui/button";
</script>

<svelte:head>
	<title>DuitGee - Track Money, Not Drama</title>
	<meta name="description" content="Stop fighting over receipts. Share expenses in vaults, track everything automatically, and actually know where your money goes." />
</svelte:head>

<div class="min-h-[calc(100vh-3.5rem)]">
	<!-- Hero Section - Split Design -->
	<section class="relative overflow-hidden">
		<div class="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10"></div>
		<div class="container relative mx-auto px-4 py-12 md:py-16 lg:py-24">
			<div class="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
				<!-- Left: Content -->
				<div class="space-y-6 md:space-y-8">
					<div class="inline-block">
						<span class="text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary px-3 py-1 rounded-full">
							No drama expense tracking
						</span>
					</div>
					<h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none">
						Track Money,<br />
						<span class="text-primary">Not Drama</span>
					</h1>
					<p class="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-lg">
						Stop fighting over who paid for what. Create shared vaults, track expenses instantly, and keep everyone on the same page.
					</p>
					<div class="flex flex-col sm:flex-row gap-3 md:gap-4">
						<a href="/register" class="group">
							<Button size="lg" class="text-base md:text-lg px-6 md:px-8 h-12 md:h-14 w-full sm:w-auto group-hover:scale-105 transition-transform">
								Start Tracking Free
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
								</svg>
							</Button>
						</a>
						<a href="/login">
							<Button variant="outline" size="lg" class="text-base md:text-lg px-6 md:px-8 h-12 md:h-14 w-full sm:w-auto hover:bg-accent">
								Sign In
							</Button>
						</a>
					</div>
				</div>

				<!-- Right: Visual Mock -->
				<div class="relative hidden lg:block">
					<div class="relative z-10 space-y-4">
						<!-- Expense Card Mock 1 -->
						<div class="bg-card border rounded-xl p-5 shadow-xl transform rotate-2 hover:rotate-0 transition-transform duration-300">
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center gap-3">
									<div class="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
										<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<circle cx="12" cy="12" r="10" stroke-width="2"/>
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2"/>
										</svg>
									</div>
									<div>
										<p class="font-semibold">Pizza Night</p>
										<p class="text-sm text-muted-foreground">Food & Dining</p>
									</div>
								</div>
								<p class="text-2xl font-bold">$45.00</p>
							</div>
							<div class="flex items-center justify-between text-xs text-muted-foreground">
								<span>Paid by Alex</span>
								<span>2 hours ago</span>
							</div>
						</div>

						<!-- Expense Card Mock 2 -->
						<div class="bg-card border rounded-xl p-5 shadow-lg transform -rotate-1 hover:rotate-0 transition-transform duration-300 ml-12">
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center gap-3">
									<div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
										<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<rect x="4" y="4" width="16" height="16" rx="2" stroke-width="2"/>
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 2v4m8-4v4M4 10h16"/>
										</svg>
									</div>
									<div>
										<p class="font-semibold">Movie Tickets</p>
										<p class="text-sm text-muted-foreground">Entertainment</p>
									</div>
								</div>
								<p class="text-2xl font-bold">$32.00</p>
							</div>
							<div class="flex items-center justify-between text-xs text-muted-foreground">
								<span>Paid by Jordan</span>
								<span>Yesterday</span>
							</div>
						</div>

						<!-- Expense Card Mock 3 -->
						<div class="bg-card border rounded-xl p-5 shadow-lg transform rotate-1 hover:rotate-0 transition-transform duration-300">
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center gap-3">
									<div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
										<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 11h14l1 10H4l1-10z"/>
										</svg>
									</div>
									<div>
										<p class="font-semibold">Groceries</p>
										<p class="text-sm text-muted-foreground">Shopping</p>
									</div>
								</div>
								<p class="text-2xl font-bold">$87.50</p>
							</div>
							<div class="flex items-center justify-between text-xs text-muted-foreground">
								<span>Paid by Sam</span>
								<span>2 days ago</span>
							</div>
						</div>
					</div>
					<!-- Decorative Blur -->
					<div class="absolute -top-20 -right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl -z-10"></div>
					<div class="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl -z-10"></div>
				</div>
			</div>
		</div>
	</section>

	<!-- Social Proof / Use Cases -->
	<section class="container mx-auto px-4 py-12 md:py-16 lg:py-24">
		<div class="max-w-5xl mx-auto">
			<h2 class="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-center mb-10 md:mb-12 lg:mb-16">
				Perfect For Every Squad
			</h2>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
				<div class="text-center space-y-3 md:space-y-4">
					<div class="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center floating">
						<svg class="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
						</svg>
					</div>
					<h3 class="text-xl md:text-2xl font-bold">Roommates</h3>
					<p class="text-sm md:text-base text-muted-foreground px-4">
						Split rent, utilities, and groceries without the spreadsheet headache.
					</p>
				</div>
				<div class="text-center space-y-3 md:space-y-4">
					<div class="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center floating" style="animation-delay: 0.2s">
						<svg class="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h4l3 9 4-18 3 9h4"/>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2L9 8h6l-3-6z"/>
						</svg>
					</div>
					<h3 class="text-xl md:text-2xl font-bold">Travel Groups</h3>
					<p class="text-sm md:text-base text-muted-foreground px-4">
						Track who paid for what on group trips. Settle up when you're home.
					</p>
				</div>
				<div class="text-center space-y-3 md:space-y-4">
					<div class="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center floating" style="animation-delay: 0.4s">
						<svg class="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<circle cx="12" cy="8" r="3" stroke-width="2"/>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
							<circle cx="6" cy="11" r="2" stroke-width="2"/>
							<circle cx="18" cy="11" r="2" stroke-width="2"/>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 21v-1a3 3 0 013-3m10 4v-1a3 3 0 00-3-3"/>
						</svg>
					</div>
					<h3 class="text-xl md:text-2xl font-bold">Families</h3>
					<p class="text-sm md:text-base text-muted-foreground px-4">
						Manage household expenses together. Everyone knows the budget.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Final CTA -->
	<section class="container mx-auto px-4 py-12 md:py-16 lg:py-24">
		<div class="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 md:p-12 lg:p-20 text-center">
			<div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
			<div class="relative z-10 max-w-3xl mx-auto space-y-6 md:space-y-8">
				<h2 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-primary-foreground tracking-tight">
					Ready to Stop Guessing?
				</h2>
				<p class="text-base md:text-lg lg:text-xl text-primary-foreground/90 leading-relaxed px-4">
					Join thousands who've ditched the chaos. Track expenses, share vaults, and actually know where your money goes.
				</p>
				<div class="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-2 md:pt-4">
					<a href="/register" class="group">
						<Button size="lg" variant="secondary" class="text-base md:text-lg px-6 md:px-8 h-12 md:h-14 w-full sm:w-auto text-primary font-bold group-hover:scale-105 transition-transform">
							Get Started Free
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						</Button>
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="container mx-auto px-4 py-8 md:py-12 border-t">
		<div class="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
			<div class="flex items-center gap-2">
				<img src="/favicon.svg" alt="DuitGee Logo" class="h-6 w-6" />
				<span class="text-muted-foreground">© {new Date().getFullYear()}</span>
			</div>
			<div class="flex gap-6 text-sm">
				<a href="/privacy" class="text-muted-foreground hover:text-primary transition-colors font-medium">Privacy</a>
				<a href="/terms" class="text-muted-foreground hover:text-primary transition-colors font-medium">Terms</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.floating {
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	/* Smooth scroll behavior */
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
