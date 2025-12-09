<script lang="ts">
import {Button} from "$lib/components/ui/button";
</script>

<svelte:head>
	<title>Privacy Policy - DuitGee</title>
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
			<h1 class="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
			<p class="text-muted-foreground mb-8">Last updated: October 11, 2025</p>

			<div class="prose prose-slate dark:prose-invert max-w-none">
				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
					<p class="text-foreground/90 mb-4">
						Welcome to DuitGee. We respect your privacy and are committed to protecting your personal data. This Privacy Policy will inform you about how we collect, use, and safeguard your information when you use our expense tracking service.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
					<p class="text-foreground/90 mb-4">
						We collect several types of information to provide and improve our Service:
					</p>

					<h3 class="text-xl font-semibold text-foreground mb-3 mt-6">2.1 Personal Information</h3>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li>Name (first and last name)</li>
						<li>Email address</li>
						<li>Profile information from OAuth providers (Google)</li>
					</ul>

					<h3 class="text-xl font-semibold text-foreground mb-3 mt-6">2.2 Expense Data</h3>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li>Expense amounts, dates, and descriptions</li>
						<li>Categories and tags you create</li>
						<li>Vault information and membership</li>
						<li>Payment methods and providers you use</li>
						<li>Templates you create</li>
					</ul>

					<h3 class="text-xl font-semibold text-foreground mb-3 mt-6">2.3 Usage Data</h3>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li>Browser type and version</li>
						<li>Device information</li>
						<li>IP address</li>
						<li>Time and date of visits</li>
						<li>Pages visited and features used</li>
					</ul>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
					<p class="text-foreground/90 mb-4">
						We use the collected data for various purposes:
					</p>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li>To provide and maintain our Service</li>
						<li>To notify you about changes to our Service</li>
						<li>To provide customer support</li>
						<li>To gather analysis or valuable information to improve our Service</li>
						<li>To monitor the usage of our Service</li>
						<li>To detect, prevent and address technical issues</li>
						<li>To provide you with expense tracking and reporting features</li>
						<li>To enable collaboration with other users in shared vaults</li>
					</ul>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">4. Data Storage and Security</h2>
					<p class="text-foreground/90 mb-4">
						We take the security of your data seriously:
					</p>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li>Your data is stored on secure Cloudflare infrastructure</li>
						<li>We use industry-standard encryption for data transmission (HTTPS)</li>
						<li>Authentication is handled through secure OAuth providers</li>
						<li>Access to your data is restricted to authorized personnel only</li>
						<li>We implement appropriate technical and organizational measures to protect your data</li>
					</ul>
					<p class="text-foreground/90 mb-4">
						However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee its absolute security.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">5. Data Sharing and Disclosure</h2>
					<p class="text-foreground/90 mb-4">
						We do not sell your personal data. We may share your information in the following situations:
					</p>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li><strong>With vault members:</strong> When you join or create a shared vault, your name and email are visible to other vault members</li>
						<li><strong>With your consent:</strong> We may disclose your information for any other purpose with your consent</li>
						<li><strong>Legal requirements:</strong> We may disclose your information if required by law or in response to valid legal requests</li>
						<li><strong>Service providers:</strong> We may share your data with third-party service providers who assist us in operating our Service (e.g., Cloudflare for hosting)</li>
					</ul>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">6. Your Data Rights</h2>
					<p class="text-foreground/90 mb-4">
						You have certain rights regarding your personal data:
					</p>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li><strong>Access:</strong> You can access and review your personal data at any time through your account</li>
						<li><strong>Correction:</strong> You can update or correct your personal information in your profile settings</li>
						<li><strong>Deletion:</strong> You can request deletion of your account and associated data</li>
						<li><strong>Export:</strong> You can request a copy of your data in a structured, machine-readable format</li>
						<li><strong>Withdraw consent:</strong> You can withdraw your consent for data processing at any time</li>
					</ul>
					<p class="text-foreground/90 mb-4">
						To exercise these rights, please contact us at support@duitgee.com
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">7. Cookies and Tracking Technologies</h2>
					<p class="text-foreground/90 mb-4">
						We use cookies and similar tracking technologies to track activity on our Service:
					</p>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li><strong>Session cookies:</strong> To maintain your login session</li>
						<li><strong>Authentication cookies:</strong> To verify your identity and provide access to the Service</li>
						<li><strong>Preference cookies:</strong> To remember your settings and preferences</li>
					</ul>
					<p class="text-foreground/90 mb-4">
						You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">8. Third-Party Services</h2>
					<p class="text-foreground/90 mb-4">
						We use third-party services that may collect information used to identify you:
					</p>
					<ul class="list-disc pl-6 mb-4 text-foreground/90 space-y-2">
						<li><strong>Google OAuth:</strong> For authentication (governed by Google's Privacy Policy)</li>
						<li><strong>Cloudflare:</strong> For hosting and infrastructure (governed by Cloudflare's Privacy Policy)</li>
					</ul>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">9. Data Retention</h2>
					<p class="text-foreground/90 mb-4">
						We will retain your personal data only for as long as necessary for the purposes set out in this Privacy Policy. We will retain and use your data to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies.
					</p>
					<p class="text-foreground/90 mb-4">
						When you delete your account, we will delete or anonymize your personal data. Some data may be retained in our backups for a limited time for disaster recovery purposes.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">10. Children's Privacy</h2>
					<p class="text-foreground/90 mb-4">
						Our Service is not intended for use by children under the age of 13. We do not knowingly collect personally identifiable information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">11. Changes to This Privacy Policy</h2>
					<p class="text-foreground/90 mb-4">
						We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
					</p>
					<p class="text-foreground/90 mb-4">
						You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
					</p>
				</section>

				<section class="mb-8">
					<h2 class="text-2xl font-semibold text-foreground mb-4">12. Contact Us</h2>
					<p class="text-foreground/90 mb-4">
						If you have any questions about this Privacy Policy, please contact us:
					</p>
					<ul class="list-none pl-0 mb-4 text-foreground/90 space-y-2">
						<li>Support: support@duitgee.com</li>
					</ul>
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
