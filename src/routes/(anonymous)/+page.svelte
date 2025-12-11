<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Separator } from "$lib/components/ui/separator";
</script>

<svelte:head>
	<title>DuitGee - Smart Expense Tracking Made Simple</title>
	<meta name="description" content="Track expenses effortlessly with shared vaults, templates, and powerful analytics. Perfect for individuals, families, and teams." />
</svelte:head>

<div class="min-h-[calc(100vh-3.5rem)]">
	<!-- Hero Section -->
	<section class="container mx-auto px-4 py-16 md:py-24">
		<div class="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
			<div class="space-y-4">
				<h1 class="text-4xl md:text-6xl font-bold tracking-tight">
					Smart Expense Tracking <br class="hidden sm:inline" />
					<span class="text-primary">Made Simple</span>
				</h1>
				<p class="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
					Track expenses effortlessly with shared vaults, reusable templates, and powerful analytics.
					Perfect for individuals, families, and teams.
				</p>
			</div>

			<div class="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
				<a href="/register">
					<Button size="lg" class="text-lg px-8 w-full">
						Get Started Free
					</Button>
				</a>
				<a href="/login">
					<Button variant="outline" size="lg" class="text-lg px-8 w-full">
						Sign In
					</Button>
				</a>
			</div>
		</div>
	</section>

	<Separator class="container mx-auto" />

	<!-- Features Section -->
	<section class="container mx-auto px-4 py-16 md:py-24">
		<div class="text-center space-y-4 mb-12">
			<h2 class="text-3xl md:text-4xl font-bold tracking-tight">
				Everything You Need to Manage Expenses
			</h2>
			<p class="text-muted-foreground text-lg max-w-2xl mx-auto">
				Powerful features designed to make expense tracking effortless and collaborative.
			</p>
		</div>

		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
			<!-- Feature: Shared Vaults -->
			<Card>
				<CardHeader>
					<div class="mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="size-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
					</div>
					<CardTitle>Shared Vaults</CardTitle>
					<CardDescription>
						Create unlimited vaults for different purposes. Share with family, roommates, or teams with role-based permissions.
					</CardDescription>
				</CardHeader>
			</Card>

			<!-- Feature: Quick Entry -->
			<Card>
				<CardHeader>
					<div class="mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="size-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<CardTitle>Quick Expense Entry</CardTitle>
					<CardDescription>
						Add expenses in seconds with smart templates. Reuse common expenses with pre-filled categories and amounts.
					</CardDescription>
				</CardHeader>
			</Card>

			<!-- Feature: Analytics -->
			<Card>
				<CardHeader>
					<div class="mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="size-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
					</div>
					<CardTitle>Powerful Analytics</CardTitle>
					<CardDescription>
						Visualize spending patterns with detailed statistics. Track expenses by category, date, and member.
					</CardDescription>
				</CardHeader>
			</Card>

			<!-- Feature: Calendar View -->
			<Card>
				<CardHeader>
					<div class="mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="size-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
					<CardTitle>Calendar View</CardTitle>
					<CardDescription>
						See expenses in calendar format. Quickly filter and review spending by day, week, or month.
					</CardDescription>
				</CardHeader>
			</Card>

			<!-- Feature: Role-Based Access -->
			<Card>
				<CardHeader>
					<div class="mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="size-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
						</svg>
					</div>
					<CardTitle>Smart Permissions</CardTitle>
					<CardDescription>
						Control who can view, add, edit, or manage expenses. Owner, admin, and member roles for granular access.
					</CardDescription>
				</CardHeader>
			</Card>

			<!-- Feature: Cloud Sync -->
			<Card>
				<CardHeader>
					<div class="mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="size-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
						</svg>
					</div>
					<CardTitle>Cloud Synced</CardTitle>
					<CardDescription>
						Access your expenses from anywhere. All data synced securely in real-time across all your devices.
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	</section>

	<Separator class="container mx-auto" />

	<!-- CTA Section -->
	<section class="container mx-auto px-4 py-16 md:py-24">
		<div class="bg-muted rounded-lg p-8 md:p-12 text-center space-y-6 max-w-3xl mx-auto">
			<h2 class="text-3xl md:text-4xl font-bold tracking-tight">
				Ready to Take Control of Your Expenses?
			</h2>
			<p class="text-muted-foreground text-lg">
				Join DuitGee today and start managing your finances smarter. No credit card required.
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
				<a href="/register">
					<Button size="lg" class="text-lg px-8 w-full sm:w-auto">
						Create Free Account
					</Button>
				</a>
				<a href="/login">
					<Button variant="outline" size="lg" class="text-lg px-8 w-full sm:w-auto">
						Sign In
					</Button>
				</a>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="container mx-auto px-4 py-8 border-t">
		<div class="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
			<div>
				© {new Date().getFullYear()} DuitGee. All rights reserved.
			</div>
			<div class="flex gap-4">
				<a href="/privacy" class="hover:text-primary transition-colors">Privacy Policy</a>
				<span>·</span>
				<a href="/terms" class="hover:text-primary transition-colors">Terms of Service</a>
			</div>
		</div>
	</footer>
</div>
