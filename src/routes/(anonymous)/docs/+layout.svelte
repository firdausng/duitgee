<script lang="ts">
	import { page } from '$app/state';
	import { docsNav } from '$lib/configurations/docs-nav';
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
	<div class="px-4 py-6">
		<main
			class="prose prose-slate dark:prose-invert prose-sm max-w-none
				prose-headings:scroll-mt-4
				prose-a:text-primary prose-a:no-underline hover:prose-a:underline
				prose-code:before:content-none prose-code:after:content-none
				prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal
				prose-h1:text-2xl prose-h1:font-bold prose-h1:tracking-tight
				prose-h2:text-lg prose-h2:font-semibold prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mt-8
				prose-h3:text-base prose-h3:font-semibold
				prose-img:rounded-lg prose-img:border prose-img:border-border
				prose-table:text-sm
				prose-th:text-left prose-th:font-semibold
				prose-td:py-2 prose-th:py-2"
		>
			{@render children()}
		</main>
	</div>
{:else}
	<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
		<div class="mb-4 lg:hidden">
			<button
				onclick={() => (mobileOpen = !mobileOpen)}
				class="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
			>
				{#if mobileOpen}
					<X class="size-4" />
					Close menu
				{:else}
					<Menu class="size-4" />
					Documentation menu
				{/if}
			</button>
		</div>

		<div class="flex gap-10">
			<aside
				class="
					{mobileOpen ? 'block' : 'hidden'}
					lg:sticky lg:top-20 lg:block lg:h-[calc(100vh-5rem)] lg:w-56 lg:shrink-0 lg:overflow-y-auto"
			>
				<div class="relative mb-6">
					<Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<input
						bind:this={searchEl}
						bind:value={query}
						onkeydown={onSearchKeydown}
						onfocus={() => (searchOpen = true)}
						type="search"
						placeholder="Search docs..."
						aria-label="Search documentation"
						class="w-full rounded-md border border-border bg-background py-2 pr-3 pl-8 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
					/>
					{#if searchOpen && query.trim().length >= 2}
						<div
							class="absolute top-full right-0 left-0 z-10 mt-1 max-h-96 overflow-y-auto rounded-md border border-border bg-popover shadow-md"
						>
							{#if results.length === 0}
								<div class="px-3 py-3 text-sm text-muted-foreground">No results for "{query}"</div>
							{:else}
								<ul class="py-1">
									{#each results as r (r.slug)}
										<li>
											<a
												href="/docs/{r.slug}"
												onclick={onResultClick}
												class="block px-3 py-2 text-sm transition-colors hover:bg-accent"
											>
												<div class="font-medium text-foreground">{r.title}</div>
												<div class="mt-0.5 text-xs text-muted-foreground">{r.group}</div>
												{#if r.description}
													<div class="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</div>
												{/if}
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</div>

				<nav>
					{#each docsNav as group (group.title)}
						<div class="mb-6">
							<h4 class="mb-2 px-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
								{group.title}
							</h4>
							<ul class="space-y-0.5">
								{#each group.items as item (item.slug)}
									<li>
										<a
											href="/docs/{item.slug}"
											onclick={() => (mobileOpen = false)}
											class="block rounded-md px-3 py-1.5 text-sm transition-colors
												{isActive(item.slug)
													? 'bg-primary/10 font-medium text-primary'
													: 'text-muted-foreground hover:bg-accent hover:text-foreground'}"
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

			<main
				class="prose prose-slate dark:prose-invert min-w-0 max-w-none flex-1
					prose-headings:scroll-mt-20
					prose-a:text-primary prose-a:no-underline hover:prose-a:underline
					prose-code:before:content-none prose-code:after:content-none
					prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal
					prose-h1:text-3xl prose-h1:font-bold prose-h1:tracking-tight
					prose-h2:text-xl prose-h2:font-semibold prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mt-10
					prose-h3:text-lg prose-h3:font-semibold
					prose-img:rounded-lg prose-img:border prose-img:border-border
					prose-table:text-sm
					prose-th:text-left prose-th:font-semibold
					prose-td:py-2 prose-th:py-2"
			>
				{@render children()}
			</main>
		</div>
	</div>
{/if}
