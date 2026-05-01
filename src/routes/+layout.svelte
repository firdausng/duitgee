<script lang="ts">
	import '../app.css';
	import GdprBanner from '@beyonk/gdpr-cookie-consent-banner'
	import posthog from 'posthog-js';
	import favicon from '$lib/assets/favicon.svg';
    import { ModeWatcher } from "mode-watcher";
	import {browser, dev} from "$app/environment";
	import { onMount } from "svelte";

	let { children, data } = $props();

	// Apply .dg-almanac to <body> so portal-rendered overlays (DropdownMenu,
	// Tooltip, Sheet, Toast, Cookie banner) inherit the almanac token palette
	// and square corners. Body is outside Svelte's component DOM tree so we
	// add the class imperatively on mount.
	onMount(() => {
		document.body.classList.add('dg-almanac');
		return () => document.body.classList.remove('dg-almanac');
	});

	function initAnalytics () {
		if (browser && !dev) {
			posthog.init(
					data.posthogKey,
					{
						api_host: 'https://us.i.posthog.com',
						defaults: '2025-05-24',
						person_profiles: 'always', // or 'always' to create profiles for anonymous users as well
					}
			)
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<GdprBanner
		cookieName="gdpr-consent"
		heading="Cookie Preferences"
		description="We use cookies to enhance your experience. Essential cookies are required, while analytics cookies help us improve our
  service. Learn more in our <a href='/privacy'>privacy policy</a>."
		choices={{
		  necessary: {
			label: "Necessary cookies",
			description: "Required for the site to function. Cannot be turned off.",
			value: true
		  },
		  analytics: {
			label: "Analytics cookies",
			description: "Help us understand how you use our application (PostHog).",
			value: false  // Default to unchecked - user must opt-in
		  }
		}}
		acceptAllLabel="Accept all"
		acceptSelectedLabel="Accept selected"
		rejectLabel="Reject all"
		settingsLabel="Preferences"
		closeLabel="Close"
		editLabel="Edit settings"

		showEditIcon={false}
		canRejectCookies={true}

		on:analytics={initAnalytics}
/>
<ModeWatcher />
{@render children?.()}
