<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/docs/overview', { replaceState: true });
	});
</script>

<svelte:head>
	<title>Documentation — DuitGee</title>
	<meta
		name="description"
		content="Learn how to use DuitGee to track shared expenses, manage funds, and spot spending patterns with your household."
	/>
</svelte:head>

<p>Redirecting to documentation...</p>
