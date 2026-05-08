<script lang="ts" module>
    export type CategoryBreakdownCardCategory = {
        categoryName: string;
        categoryIcon?: string;
        categoryIconType?: string;
        totalAmount: number;
        count: number;
    };

    export type CategoryBreakdownCardTemplate = {
        templateId: string | null;
        templateName: string;
        templateIcon: string;
        totalAmount: number;
        count: number;
    };

    export type CategoryBreakdownCardMember = {
        userId: string | null;
        displayName: string;
        totalAmount: number;
        count: number;
    };

    export type CategoryBreakdownCardProps = {
        vaultId: string;
        categories: CategoryBreakdownCardCategory[];
        templates?: CategoryBreakdownCardTemplate[];
        members?: CategoryBreakdownCardMember[];
        /** When false, the Member toggle is hidden (solo vault). */
        showMemberToggle?: boolean;
        loading?: boolean;
        formatCurrency: (amount: number) => string;
        /** Forwarded to /statistics when a row is clicked. */
        currentSearch?: string;
    };

    type BreakdownMode = 'category' | 'template' | 'member';
</script>

<script lang="ts">
    import { goto } from '$app/navigation';
    import { BreakdownBars, type BreakdownRow } from '$lib/components/ui/breakdown-bars';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import PieChart from '@lucide/svelte/icons/pie-chart';

    let {
        vaultId,
        categories,
        templates = [],
        members = [],
        showMemberToggle = false,
        loading = false,
        formatCurrency,
        currentSearch = '',
    }: CategoryBreakdownCardProps = $props();

    const storageKey = $derived(`dg:breakdown-mode:${vaultId}`);

    let mode = $state<BreakdownMode>('category');

    function isValidMode(v: string | null): v is BreakdownMode {
        return v === 'category' || v === 'template' || v === 'member';
    }

    $effect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(storageKey);
        if (isValidMode(stored)) {
            // Don't restore 'member' if the toggle is hidden — would leave the user stuck.
            if (stored === 'member' && !showMemberToggle) {
                mode = 'category';
            } else {
                mode = stored;
            }
        }
    });

    function setMode(next: BreakdownMode) {
        mode = next;
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(storageKey, next);
        }
    }

    const rows = $derived<BreakdownRow[]>(
        mode === 'category'
            ? categories.map((c) => ({
                  id: c.categoryName,
                  label: c.categoryName,
                  icon: c.categoryIcon ?? null,
                  iconType: c.categoryIconType ?? null,
                  value: c.totalAmount,
                  count: c.count,
              }))
            : mode === 'template'
              ? templates
                    .filter((t) => t.templateId !== null)
                    .map((t) => ({
                        id: t.templateId,
                        label: t.templateName,
                        icon: t.templateIcon ?? null,
                        iconType: null,
                        value: t.totalAmount,
                        count: t.count,
                    }))
              : members
                    .filter((m) => m.userId !== null)
                    .map((m) => ({
                        id: m.userId,
                        label: m.displayName,
                        icon: null,
                        iconType: null,
                        value: m.totalAmount,
                        count: m.count,
                    })),
    );

    const total = $derived(rows.reduce((sum, r) => sum + r.value, 0));

    const subline = $derived.by(() => {
        const n = rows.length;
        if (mode === 'category') return `across ${n} categor${n === 1 ? 'y' : 'ies'}`;
        if (mode === 'template') return `across ${n} template${n === 1 ? '' : 's'}`;
        return `across ${n} member${n === 1 ? '' : 's'}`;
    });

    const emptyCopy = $derived.by(() => {
        if (mode === 'category') return 'No spending in this period yet.';
        if (mode === 'template') return 'No expenses linked to a template in this period.';
        return 'No expenses attributed to a member in this period.';
    });

    function handleSelect(row: BreakdownRow) {
        const params = new URLSearchParams(currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch);
        if (mode === 'category') {
            params.set('filterType', 'category');
            params.set('filterName', row.label);
        } else if (mode === 'template') {
            params.set('filterType', 'template');
            params.set('filterName', row.label);
            if (row.id) params.set('filterId', row.id);
        } else {
            params.set('filterType', 'member');
            params.set('filterName', row.label);
            if (row.id) params.set('filterId', row.id);
        }
        goto(`/vaults/${vaultId}/statistics?${params.toString()}`);
    }

    function viewAll() {
        const search = currentSearch.startsWith('?') ? currentSearch : currentSearch ? `?${currentSearch}` : '';
        goto(`/vaults/${vaultId}/statistics${search}`);
    }
</script>

<section class="dg-cb space-y-2">
    <div class="flex items-end justify-between px-1 gap-2">
        <div class="min-w-0">
            <p class="dg-cb__eyebrow">— Where it went —</p>
            {#if total > 0}
                <p class="dg-cb__total"><em>{formatCurrency(total)}</em> {subline}</p>
            {/if}
        </div>
        <div class="flex items-center gap-3 shrink-0">
            <div class="dg-cb__toggle" role="tablist" aria-label="Group breakdown by">
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'category'}
                    onclick={() => setMode('category')}
                    class="dg-cb__toggle-btn"
                    class:is-active={mode === 'category'}
                >
                    Category
                </button>
                <span class="dg-cb__toggle-sep" aria-hidden="true">·</span>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'template'}
                    onclick={() => setMode('template')}
                    class="dg-cb__toggle-btn"
                    class:is-active={mode === 'template'}
                >
                    Template
                </button>
                {#if showMemberToggle}
                    <span class="dg-cb__toggle-sep" aria-hidden="true">·</span>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mode === 'member'}
                        onclick={() => setMode('member')}
                        class="dg-cb__toggle-btn"
                        class:is-active={mode === 'member'}
                    >
                        Member
                    </button>
                {/if}
            </div>
            <button type="button" onclick={viewAll} class="dg-cb__link">
                View all <ArrowRight class="size-3" />
            </button>
        </div>
    </div>

    {#if loading}
        <div class="rounded-[var(--radius-md)] border bg-card p-4 space-y-2">
            {#each Array(3) as _, i (i)}
                <div class="h-8 rounded animate-pulse bg-muted/50"></div>
            {/each}
        </div>
    {:else if rows.length === 0}
        <div class="rounded-[var(--radius-md)] border bg-card flex flex-col items-center justify-center text-center py-6 px-4">
            <PieChart class="size-6 text-muted-foreground mb-2" />
            <p class="text-sm text-muted-foreground">
                {emptyCopy}
            </p>
        </div>
    {:else}
        <BreakdownBars
            {rows}
            limit={5}
            {formatCurrency}
            onSelect={handleSelect}
        />
    {/if}
</section>

<style>
    .dg-cb__eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.68rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--almanac-ink-3);
        margin: 0;
    }
    .dg-cb__total {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.85rem;
        color: var(--almanac-ink-2);
        margin: 0.2rem 0 0;
    }
    .dg-cb__total em {
        font-family: 'JetBrains Mono', monospace;
        font-style: normal;
        color: var(--almanac-oxblood);
        font-feature-settings: 'tnum';
    }
    .dg-cb__link {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.85rem;
        color: var(--almanac-oxblood);
        text-decoration: underline;
        text-underline-offset: 3px;
        background: none;
        border: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        flex-shrink: 0;
        padding: 0;
    }
    .dg-cb__toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.14em;
    }
    .dg-cb__toggle-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        color: var(--almanac-ink-3);
        font: inherit;
        text-transform: inherit;
        letter-spacing: inherit;
        transition: color 120ms ease;
    }
    .dg-cb__toggle-btn:hover {
        color: var(--almanac-ink-2);
    }
    .dg-cb__toggle-btn.is-active {
        color: var(--almanac-oxblood);
        text-decoration: underline;
        text-underline-offset: 3px;
        text-decoration-thickness: 1px;
    }
    .dg-cb__toggle-sep {
        color: var(--almanac-ink-3);
        opacity: 0.5;
    }
</style>
