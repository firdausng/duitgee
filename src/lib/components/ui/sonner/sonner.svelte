<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from "svelte-sonner";
	import { mode } from "mode-watcher";

	let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
	theme={mode.current}
	class="dg-toaster toaster group"
	style="--normal-bg: var(--almanac-card); --normal-text: var(--almanac-ink); --normal-border: var(--almanac-ink); --border-radius: 0;"
	{...restProps}
/>

<style>
	/* Almanac toast — cream plate with hairline ink border, no radius.
	   Sonner portals outside the .dg-almanac scope, so we pull tokens from
	   :root (where --almanac-* live) directly via the inline `style` above
	   and add font/structure tweaks here. */
	:global(.dg-toaster [data-sonner-toast]) {
		border-radius: 0 !important;
		border-width: 1px !important;
		box-shadow: none !important;
		font-family: 'Newsreader', serif;
	}
	:global(.dg-toaster [data-title]) {
		font-family: 'Fraunces', Georgia, serif;
		font-variation-settings: 'opsz' 96, 'SOFT' 60, 'wght' 460;
		font-style: italic;
		font-size: 1rem;
		letter-spacing: -0.012em;
		color: var(--almanac-ink);
	}
	:global(.dg-toaster [data-description]) {
		font-family: 'Newsreader', serif;
		font-size: 0.88rem;
		color: var(--almanac-ink-2);
	}
	:global(.dg-toaster [data-button]) {
		border-radius: 0 !important;
		font-family: 'Plus Jakarta Sans', sans-serif !important;
		font-weight: 600 !important;
	}
	:global(.dg-toaster [data-action-button]) {
		background: var(--almanac-oxblood) !important;
		color: var(--almanac-paper) !important;
	}
</style>
