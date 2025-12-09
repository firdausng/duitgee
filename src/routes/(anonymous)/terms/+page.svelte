<script lang="ts">
import {Button} from "$lib/components/ui/button";
</script>

<svelte:head>
	<title>Terms of Service - DuitGee</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
	<!-- Header -->
	<header class="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<a href="/" class="flex items-center gap-3">
					<div class="bg-primary/10 p-2 rounded-xl">
						<img src="/favicon.svg" alt="DuitGee" class="w-8 h-8" />
					</div>
					<h1 class="text-2xl font-bold text-primary">DuitGee</h1>
				</a>
				<a href="/login">
					<Button variant="outline">Back to Login</Button>
				</a>
			</div>
		</div>
	</header>

	<!-- Content -->
	<main class="container mx-auto px-4 py-12 max-w-4xl">
		<div class="bg-card border border-border rounded-lg shadow-lg p-8">
			<h1 class="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
			<p class="text-muted-foreground mb-8">Last updated: October 11, 2025</p>

			<div class="prose prose-slate dark:prose-invert max-w-none">
				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
					<p class="text-foreground/90 mb-4">
						By accessing and using DuitGee ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
					<p class="text-foreground/90 mb-4">
						DuitGee is an expense tracking application that allows users to:
					</p>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li>Track personal and shared expenses</li>
						<li>Create and manage vaults for organizing expenses</li>
						<li>Categorize and tag expenses</li>
						<li>Generate expense reports and summaries</li>
						<li>Collaborate with other users on shared vaults</li>
					</ul>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">3. User Accounts</h2>
					<p class="text-foreground/90 mb-4">
						To use DuitGee, you must create an account. You agree to:
					</p>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li>Provide accurate, current, and complete information during registration</li>
						<li>Maintain and promptly update your account information</li>
						<li>Maintain the security of your password and account</li>
						<li>Accept all responsibility for all activities that occur under your account</li>
						<li>Notify us immediately of any unauthorized use of your account</li>
					</ul>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">4. User Conduct</h2>
					<p class="text-foreground/90 mb-4">
						You agree not to use the Service to:
					</p>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li>Violate any applicable laws or regulations</li>
						<li>Infringe upon the rights of others</li>
						<li>Upload or transmit viruses or malicious code</li>
						<li>Attempt to gain unauthorized access to the Service or related systems</li>
						<li>Interfere with or disrupt the Service or servers</li>
						<li>Use the Service for any illegal or unauthorized purpose</li>
					</ul>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">5. Data and Privacy</h2>
					<p class="text-foreground/90 mb-4">
						Your use of the Service is also governed by our Privacy Policy. We collect and use your data as described in the Privacy Policy. By using the Service, you consent to such processing and you warrant that all data provided by you is accurate.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">6. Intellectual Property</h2>
					<p class="text-foreground/90 mb-4">
						The Service and its original content, features, and functionality are owned by DuitGee and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">7. Termination</h2>
					<p class="text-foreground/90 mb-4">
						We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach the Terms of Service. Upon termination, your right to use the Service will immediately cease.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">8. Limitation of Liability</h2>
					<p class="text-foreground/90 mb-4">
						In no event shall DuitGee, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">9. Disclaimer</h2>
					<p class="text-foreground/90 mb-4">
						Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">10. Changes to Terms</h2>
					<p class="text-foreground/90 mb-4">
						We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">11. Contact Us</h2>
					<p class="text-foreground/90 mb-4">
						If you have any questions about these Terms of Service, please contact us at:
					</p>
					<p class="text-foreground/90">
						Email: support@duitgee.com
					</p>
				</section>
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t border-border bg-card/50 backdrop-blur-sm py-8 mt-12">
		<div class="container mx-auto px-4 text-center">
			<p class="text-muted-foreground text-sm">
				&copy; 2025 DuitGee. All rights reserved.
			</p>
			<div class="flex justify-center gap-6 mt-4">
				<a href="/terms" class="text-sm text-primary hover:underline">Terms of Service</a>
				<a href="/privacy" class="text-sm text-primary hover:underline">Privacy Policy</a>
			</div>
		</div>
	</footer>
</div>
