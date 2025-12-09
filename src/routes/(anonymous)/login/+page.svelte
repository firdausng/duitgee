<script lang="ts">
	import { goto } from "$app/navigation";
	import { authClientBase } from "$lib/client/auth-client-base";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "$lib/components/ui/card";
	import { Separator } from "$lib/components/ui/separator";
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { loginSchema } from '$lib/schemas/login';

	let { data } = $props();

	const { form, errors, enhance, delayed, message } = superForm(data.form, {
		validators: valibotClient(loginSchema),
		resetForm: false,
		onUpdated({ form }) {
			if (form.valid && form.message && typeof form.message === 'object' && 'success' in form.message && form.message.success) {
				goto('/');
			}
		}
	});

	let { basePath, callbackPath } = data;
	let authClient = authClientBase({ basePath: data.basePath });
	let isGoogleLoading = $state(false);

	async function handleGoogleLogin() {
		isGoogleLoading = true;
		try {
			const response = await authClient.signIn.social({
				provider: "google",
				callbackURL: callbackPath,
				errorCallbackURL: "/error"
			});
		} catch (error) {
			console.error('Google login error:', error);
		} finally {
			isGoogleLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign In - DuitGee</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-muted/40 p-4">
	<Card class="w-full max-w-md">
		<CardHeader class="space-y-1">
			<CardTitle class="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
			<CardDescription>Sign in to your DuitGee account</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if $message}
				<div class="bg-destructive/10 text-destructive border-destructive/20 rounded-md border px-4 py-3 text-sm">
					{$message}
				</div>
			{/if}

			<Button
				variant="outline"
				class="w-full"
				onclick={handleGoogleLogin}
				disabled={isGoogleLoading || $delayed}
			>
				<svg class="mr-2 size-4" viewBox="0 0 24 24">
					<path
						fill="currentColor"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					/>
					<path
						fill="currentColor"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					/>
					<path
						fill="currentColor"
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					/>
					<path
						fill="currentColor"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					/>
				</svg>
				{isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
			</Button>

			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<Separator />
				</div>
				<div class="relative flex justify-center text-xs uppercase">
					<span class="bg-card text-muted-foreground px-2">Or continue with email</span>
				</div>
			</div>

			<form method="POST" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						placeholder="john.doe@example.com"
						bind:value={$form.email}
						disabled={$delayed}
						autocomplete="email"
						aria-invalid={$errors.email ? 'true' : undefined}
					/>
					{#if $errors.email}
						<p class="text-destructive text-sm">{$errors.email}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<Label for="password">Password</Label>
						<a href="/forgot-password" class="text-primary hover:underline text-sm">
							Forgot password?
						</a>
					</div>
					<Input
						id="password"
						name="password"
						type="password"
						placeholder="••••••••"
						bind:value={$form.password}
						disabled={$delayed}
						autocomplete="current-password"
						aria-invalid={$errors.password ? 'true' : undefined}
					/>
					{#if $errors.password}
						<p class="text-destructive text-sm">{$errors.password}</p>
					{/if}
				</div>

				<Button type="submit" class="w-full" disabled={$delayed}>
					{$delayed ? 'Signing in...' : 'Sign in'}
				</Button>
			</form>
		</CardContent>
		<CardFooter class="flex flex-col gap-4">
			<div class="text-muted-foreground text-center text-sm">
				Don't have an account?
				<a href="/register" class="text-primary hover:underline font-medium">
					Sign up
				</a>
			</div>
			<div class="text-muted-foreground text-center text-xs">
				<a href="/privacy" class="hover:underline">
					Privacy Policy
				</a>
				<span class="mx-2">·</span>
				<a href="/terms" class="hover:underline">
					Terms of Service
				</a>
			</div>
		</CardFooter>
	</Card>
</div>
