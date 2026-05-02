<script lang="ts">
	import { page } from '$app/state';
	import { docsNav } from '$lib/configurations/docs-nav';
	import { Eyebrow, Rule } from '$lib/components/almanac';
	import { Menu, X, Search } from '@lucide/svelte';
	import Fuse from 'fuse.js';

	let { children } = $props();
	let mobileOpen = $state(false);
	let query = $state('');
	let searchOpen = $state(false);
	let searchEl: HTMLInputElement | undefined = $state();

	const isEmbed = $derived(page.url.searchParams.get('embed') === '1');

	const currentSlug = $derived.by(() => {
		const path = page.url.pathname;
		const slug = path.replace('/docs/', '').replace('/docs', '');
		return slug || 'overview';
	});

	function isActive(slug: string): boolean {
		if (slug === 'overview' && currentSlug === '') return true;
		return currentSlug === slug;
	}

	type SearchEntry = {
		slug: string;
		title: string;
		description: string;
		group: string;
		body: string;
	};

	const rawModules = import.meta.glob('./*/+page.md', {
		query: '?raw',
		import: 'default',
		eager: true,
	}) as Record<string, string>;

	const slugToGroup = new Map<string, string>();
	const slugToTitle = new Map<string, string>();
	for (const group of docsNav) {
		for (const item of group.items) {
			slugToGroup.set(item.slug, group.title);
			slugToTitle.set(item.slug, item.title);
		}
	}

	function parseFrontmatter(raw: string): { title: string; description: string; body: string } {
		const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
		if (!match) return { title: '', description: '', body: raw };
		const [, fm, body] = match;
		const titleMatch = fm.match(/^title:\s*(.+)$/m);
		const descMatch = fm.match(/^description:\s*(.+)$/m);
		return {
			title: titleMatch?.[1].trim().replace(/^['"]|['"]$/g, '') ?? '',
			description: descMatch?.[1].trim().replace(/^['"]|['"]$/g, '') ?? '',
			body: body
				.replace(/<svelte:head>[\s\S]*?<\/svelte:head>/g, '')
				.replace(/`{1,3}[^`]*`{1,3}/g, ' ')
				.replace(/[#*_>\-]+/g, ' ')
				.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
				.replace(/\s+/g, ' ')
				.trim(),
		};
	}

	const searchEntries: SearchEntry[] = Object.entries(rawModules)
		.map(([path, raw]) => {
			const slug = path.replace('./', '').replace('/+page.md', '');
			const { title, description, body } = parseFrontmatter(raw);
			return {
				slug,
				title: title || slugToTitle.get(slug) || slug,
				description,
				group: slugToGroup.get(slug) || '',
				body,
			};
		})
		.filter((e) => slugToGroup.has(e.slug));

	const fuse = new Fuse(searchEntries, {
		keys: [
			{ name: 'title', weight: 0.5 },
			{ name: 'description', weight: 0.3 },
			{ name: 'body', weight: 0.2 },
		],
		threshold: 0.4,
		ignoreLocation: true,
		minMatchCharLength: 2,
	});

	const results = $derived(query.trim().length >= 2 ? fuse.search(query.trim(), { limit: 8 }).map((r) => r.item) : []);

	function onSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			query = '';
			searchOpen = false;
			searchEl?.blur();
		}
	}

	function onResultClick() {
		query = '';
		searchOpen = false;
		mobileOpen = false;
	}
</script>

<svelte:head>
	{#if !isEmbed}
		<meta property="og:type" content="article" />
		<meta property="og:site_name" content="DuitGee" />
		<meta name="twitter:card" content="summary" />
	{/if}
</svelte:head>

{#if isEmbed}
	<div class="dg-docs-embed">
		<main class="dg-docs-prose">
			{@render children()}
		</main>
	</div>
{:else}
	<div class="dg-docs">
		<div class="dg-docs__inner">
			<div class="dg-docs__mobile-bar">
				<button
					type="button"
					class="dg-docs__menu-btn"
					onclick={() => (mobileOpen = !mobileOpen)}
				>
					{#if mobileOpen}
						<X class="size-4" />
						<span>Close menu</span>
					{:else}
						<Menu class="size-4" />
						<span>Documentation menu</span>
					{/if}
				</button>
			</div>

			<aside class="dg-docs__aside" class:dg-docs__aside--open={mobileOpen}>
				<div class="dg-docs__masthead">
					<Eyebrow tone="muted">— The almanac &middot; documentation —</Eyebrow>
					<h2 class="dg-docs__masthead-title">
						The <em>handbook</em>.
					</h2>
				</div>
				<Rule />

				<div class="dg-docs__search">
					<Search class="dg-docs__search-icon" />
					<input
						bind:this={searchEl}
						bind:value={query}
						onkeydown={onSearchKeydown}
						onfocus={() => (searchOpen = true)}
						type="search"
						placeholder="Search the volume…"
						aria-label="Search documentation"
						class="dg-docs__search-input"
					/>
					{#if searchOpen && query.trim().length >= 2}
						<div class="dg-docs__search-results">
							{#if results.length === 0}
								<div class="dg-docs__search-empty">
									No entries for &ldquo;<em>{query}</em>&rdquo;.
								</div>
							{:else}
								<ul class="dg-docs__search-list">
									{#each results as r (r.slug)}
										<li>
											<a href="/docs/{r.slug}" onclick={onResultClick} class="dg-docs__search-result">
												<span class="dg-docs__search-result-title">{r.title}</span>
												<span class="dg-docs__search-result-group">{r.group}</span>
												{#if r.description}
													<span class="dg-docs__search-result-desc">{r.description}</span>
												{/if}
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</div>

				<nav class="dg-docs__nav">
					{#each docsNav as group (group.title)}
						<div class="dg-docs__nav-group">
							<div class="dg-docs__nav-eyebrow">— {group.title} —</div>
							<ul class="dg-docs__nav-list">
								{#each group.items as item (item.slug)}
									<li>
										<a
											href="/docs/{item.slug}"
											onclick={() => (mobileOpen = false)}
											class="dg-docs__nav-link"
											class:dg-docs__nav-link--active={isActive(item.slug)}
										>
											{item.title}
										</a>
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</nav>
			</aside>

			<main class="dg-docs__main dg-docs-prose">
				{@render children()}
			</main>
		</div>
	</div>
{/if}

<style>
	.dg-docs {
		max-width: 78rem;
		margin: 0 auto;
		padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 2rem);
		color: var(--almanac-ink);
	}

	.dg-docs__inner {
		display: grid;
		grid-template-columns: 1fr;
		gap: clamp(1.5rem, 3vw, 2.5rem);
	}

	@media (min-width: 1024px) {
		.dg-docs__inner {
			grid-template-columns: 17rem 1fr;
		}
	}

	/* Mobile menu trigger */
	.dg-docs__mobile-bar {
		display: block;
	}
	@media (min-width: 1024px) {
		.dg-docs__mobile-bar { display: none; }
	}
	.dg-docs__menu-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--almanac-ink-2);
		background: var(--almanac-card);
		border: 1px solid var(--almanac-ink);
		padding: 0.5rem 0.8rem;
		cursor: pointer;
		transition: background-color 120ms;
	}
	.dg-docs__menu-btn:hover { background: var(--almanac-paper-2); }

	/* Sidebar */
	.dg-docs__aside {
		display: none;
	}
	.dg-docs__aside--open { display: block; }
	@media (min-width: 1024px) {
		.dg-docs__aside {
			display: block;
			position: sticky;
			top: 5rem;
			align-self: start;
			max-height: calc(100vh - 6rem);
			overflow-y: auto;
		}
	}

	.dg-docs__masthead {
		padding: 0.25rem 0 0.5rem;
	}
	.dg-docs__masthead-title {
		font-family: 'Fraunces', Georgia, serif;
		font-variation-settings: 'opsz' 144, 'SOFT' 50, 'wght' 400;
		font-size: 1.5rem;
		line-height: 1.05;
		letter-spacing: -0.014em;
		color: var(--almanac-ink);
		margin: 0.4rem 0 0.6rem;
	}
	.dg-docs__masthead-title em {
		font-style: italic;
		font-variation-settings: 'opsz' 144, 'SOFT' 100, 'wght' 380;
		color: var(--almanac-oxblood);
	}

	/* Search */
	.dg-docs__search {
		position: relative;
		margin: 1rem 0 1.25rem;
	}
	:global(.dg-docs__search-icon) {
		position: absolute;
		left: 0.6rem;
		top: 50%;
		transform: translateY(-50%);
		width: 0.95rem;
		height: 0.95rem;
		color: var(--almanac-ink-3);
		pointer-events: none;
	}
	.dg-docs__search-input {
		width: 100%;
		font-family: 'Newsreader', serif;
		font-size: 0.95rem;
		font-style: italic;
		color: var(--almanac-ink);
		background: var(--almanac-card);
		border: 1px solid var(--almanac-ink);
		border-radius: 0;
		padding: 0.5rem 0.6rem 0.5rem 2rem;
		outline: none;
	}
	.dg-docs__search-input::placeholder {
		color: var(--almanac-ink-3);
		font-style: italic;
	}
	.dg-docs__search-input:focus {
		box-shadow: inset 0 -2px 0 0 var(--almanac-oxblood);
	}

	.dg-docs__search-results {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 20;
		background: var(--almanac-card);
		border: 1px solid var(--almanac-ink);
		max-height: 24rem;
		overflow-y: auto;
	}
	.dg-docs__search-empty {
		padding: 0.75rem 0.9rem;
		font-family: 'Newsreader', serif;
		font-size: 0.9rem;
		color: var(--almanac-ink-2);
	}
	.dg-docs__search-empty em {
		font-style: italic;
		color: var(--almanac-oxblood);
	}
	.dg-docs__search-list {
		list-style: none;
		margin: 0;
		padding: 0.25rem 0;
	}
	.dg-docs__search-list li {
		border-bottom: 1px dashed var(--almanac-rule-soft);
	}
	.dg-docs__search-list li:last-child { border-bottom: none; }
	.dg-docs__search-result {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.55rem 0.9rem;
		text-decoration: none;
		transition: background-color 120ms;
	}
	.dg-docs__search-result:hover {
		background: color-mix(in oklch, var(--almanac-oxblood) 8%, transparent);
	}
	.dg-docs__search-result-title {
		font-family: 'Fraunces', Georgia, serif;
		font-style: italic;
		font-variation-settings: 'opsz' 96, 'SOFT' 60, 'wght' 460;
		font-size: 1rem;
		color: var(--almanac-ink);
	}
	.dg-docs__search-result-group {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--almanac-ink-3);
	}
	.dg-docs__search-result-desc {
		font-family: 'Newsreader', serif;
		font-size: 0.82rem;
		font-style: italic;
		color: var(--almanac-ink-2);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Nav */
	.dg-docs__nav {
		margin-top: 0.5rem;
	}
	.dg-docs__nav-group {
		margin-bottom: 1.4rem;
	}
	.dg-docs__nav-eyebrow {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.66rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--almanac-ink-3);
		padding: 0 0.25rem 0.4rem;
	}
	.dg-docs__nav-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.dg-docs__nav-link {
		display: block;
		font-family: 'Newsreader', serif;
		font-size: 0.95rem;
		color: var(--almanac-ink-2);
		text-decoration: none;
		padding: 0.32rem 0.7rem;
		border-left: 2px solid transparent;
		transition: background-color 120ms, color 120ms;
	}
	.dg-docs__nav-link:hover {
		background: color-mix(in oklch, var(--almanac-oxblood) 8%, transparent);
		color: var(--almanac-ink);
	}
	.dg-docs__nav-link--active {
		font-style: italic;
		font-family: 'Fraunces', Georgia, serif;
		font-variation-settings: 'opsz' 96, 'SOFT' 80, 'wght' 460;
		color: var(--almanac-oxblood);
		background: color-mix(in oklch, var(--almanac-oxblood) 14%, transparent);
		border-left-color: var(--almanac-oxblood);
	}

	/* Main content well */
	.dg-docs__main {
		min-width: 0;
		background: var(--almanac-card);
		border: 1px solid var(--almanac-ink);
		padding: clamp(1.75rem, 4vw, 3rem) clamp(1.25rem, 3.5vw, 2.5rem);
	}

	/* Embed mode (no sidebar, no chrome) */
	.dg-docs-embed {
		padding: 1.25rem;
	}

	/* ============================================================
	   Editorial prose styling — applied to mdsvex output globally
	   ============================================================ */
	:global(.dg-docs-prose) {
		color: var(--almanac-ink);
		font-family: 'Newsreader', serif;
		font-size: 1rem;
		line-height: 1.7;
	}

	:global(.dg-docs-prose > *:first-child) { margin-top: 0; }
	:global(.dg-docs-prose > *:last-child) { margin-bottom: 0; }

	/* Headings */
	:global(.dg-docs-prose h1) {
		font-family: 'Fraunces', Georgia, serif;
		font-variation-settings: 'opsz' 144, 'SOFT' 50, 'wght' 400;
		font-style: italic;
		font-size: clamp(2.2rem, 4.4vw, 3rem);
		line-height: 1.05;
		letter-spacing: -0.018em;
		color: var(--almanac-oxblood);
		margin: 0 0 0.6rem;
		scroll-margin-top: 5rem;
	}
	:global(.dg-docs-prose h1 + p) {
		font-family: 'Newsreader', serif;
		font-style: italic;
		font-size: 1.05rem;
		color: var(--almanac-ink-2);
		margin-top: 0;
		margin-bottom: 1.6rem;
	}
	:global(.dg-docs-prose h2) {
		font-family: 'Fraunces', Georgia, serif;
		font-variation-settings: 'opsz' 144, 'SOFT' 60, 'wght' 380;
		font-style: italic;
		font-size: clamp(1.45rem, 2.4vw, 1.8rem);
		line-height: 1.15;
		letter-spacing: -0.012em;
		color: var(--almanac-ink);
		margin: 2.2rem 0 0.9rem;
		padding-top: 1.4rem;
		border-top: 1px solid var(--almanac-ink);
		scroll-margin-top: 5rem;
	}
	:global(.dg-docs-prose h3) {
		font-family: 'Fraunces', Georgia, serif;
		font-variation-settings: 'opsz' 96, 'SOFT' 50, 'wght' 460;
		font-size: 1.1rem;
		line-height: 1.3;
		color: var(--almanac-ink);
		margin: 1.6rem 0 0.6rem;
		scroll-margin-top: 5rem;
	}
	:global(.dg-docs-prose h4) {
		font-family: 'Fraunces', Georgia, serif;
		font-variation-settings: 'opsz' 96, 'SOFT' 40, 'wght' 500;
		font-size: 1rem;
		color: var(--almanac-ink);
		margin: 1.4rem 0 0.5rem;
	}

	/* Paragraphs */
	:global(.dg-docs-prose p) {
		margin: 0 0 1rem;
		color: var(--almanac-ink-2);
	}
	:global(.dg-docs-prose p em),
	:global(.dg-docs-prose li em) {
		font-style: italic;
		color: var(--almanac-oxblood);
	}
	:global(.dg-docs-prose strong) {
		font-weight: 600;
		font-style: italic;
		color: var(--almanac-ink);
	}

	/* Links */
	:global(.dg-docs-prose a) {
		color: var(--almanac-oxblood);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
		font-style: italic;
	}
	:global(.dg-docs-prose a:hover) { opacity: 0.8; }

	/* Lists */
	:global(.dg-docs-prose ul),
	:global(.dg-docs-prose ol) {
		list-style: none;
		padding: 0;
		margin: 0 0 1rem;
		color: var(--almanac-ink-2);
	}
	:global(.dg-docs-prose ul li),
	:global(.dg-docs-prose ol li) {
		position: relative;
		padding: 0.4rem 0 0.4rem 1.4rem;
		border-bottom: 1px dashed var(--almanac-rule-soft);
	}
	:global(.dg-docs-prose ul li:last-child),
	:global(.dg-docs-prose ol li:last-child) {
		border-bottom: none;
	}
	:global(.dg-docs-prose ul li::before) {
		content: "";
		position: absolute;
		left: 0;
		top: 0.85rem;
		width: 0.45rem;
		height: 0.45rem;
		background: var(--almanac-oxblood);
	}
	:global(.dg-docs-prose ol) {
		counter-reset: dg-doc-ol;
	}
	:global(.dg-docs-prose ol li) {
		counter-increment: dg-doc-ol;
		padding-left: 2rem;
	}
	:global(.dg-docs-prose ol li::before) {
		content: counter(dg-doc-ol, decimal) ".";
		position: absolute;
		left: 0;
		top: 0.4rem;
		font-family: 'Fraunces', Georgia, serif;
		font-style: italic;
		color: var(--almanac-gold);
		font-size: 1rem;
		min-width: 1.6rem;
	}
	:global(.dg-docs-prose li > p) { margin: 0; }
	:global(.dg-docs-prose li ul),
	:global(.dg-docs-prose li ol) {
		margin: 0.4rem 0 0;
	}
	:global(.dg-docs-prose li ul li),
	:global(.dg-docs-prose li ol li) {
		border-bottom: none;
		padding: 0.2rem 0 0.2rem 1.4rem;
	}

	/* Code */
	:global(.dg-docs-prose code) {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85em;
		background: var(--almanac-paper-2);
		color: var(--almanac-ink);
		padding: 0.1rem 0.35rem;
		border: 1px solid var(--almanac-rule-soft);
	}
	:global(.dg-docs-prose pre) {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85rem;
		background: var(--almanac-paper-2);
		color: var(--almanac-ink);
		border: 1px solid var(--almanac-ink);
		padding: 0.9rem 1.1rem;
		margin: 1rem 0;
		overflow-x: auto;
		line-height: 1.55;
	}
	:global(.dg-docs-prose pre code) {
		background: transparent;
		border: none;
		padding: 0;
		font-size: inherit;
	}

	/* Blockquote */
	:global(.dg-docs-prose blockquote) {
		font-family: 'Newsreader', serif;
		font-style: italic;
		font-size: 1.02rem;
		color: var(--almanac-ink);
		border-left: 2px solid var(--almanac-oxblood);
		padding: 0.2rem 0 0.2rem 1rem;
		margin: 1.2rem 0;
	}
	:global(.dg-docs-prose blockquote p) {
		color: inherit;
		margin: 0 0 0.5rem;
	}
	:global(.dg-docs-prose blockquote p:last-child) { margin: 0; }

	/* Horizontal rule */
	:global(.dg-docs-prose hr) {
		border: none;
		border-top: 1px solid var(--almanac-ink);
		margin: 2rem 0;
	}

	/* Tables */
	:global(.dg-docs-prose table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.2rem 0;
		font-family: 'Newsreader', serif;
		font-size: 0.95rem;
	}
	:global(.dg-docs-prose thead th) {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 500;
		text-align: left;
		color: var(--almanac-ink);
		padding: 0.55rem 0.7rem;
		border-bottom: 1px solid var(--almanac-ink);
		background: var(--almanac-paper-2);
	}
	:global(.dg-docs-prose tbody td) {
		padding: 0.55rem 0.7rem;
		border-bottom: 1px dashed var(--almanac-rule-soft);
		color: var(--almanac-ink-2);
		vertical-align: top;
	}
	:global(.dg-docs-prose tbody tr:last-child td) {
		border-bottom: 1px solid var(--almanac-ink);
	}
	:global(.dg-docs-prose tbody td em) {
		font-style: italic;
		color: var(--almanac-oxblood);
	}
	:global(.dg-docs-prose tbody td strong) {
		font-style: italic;
		color: var(--almanac-ink);
	}

	/* Images */
	:global(.dg-docs-prose img) {
		display: block;
		max-width: 100%;
		height: auto;
		margin: 1.2rem auto;
		border: 1px solid var(--almanac-ink);
	}
</style>
