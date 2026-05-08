<script lang="ts">
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { QuickLogModal } from '$lib/components/unidentified';
    import Plus from '@lucide/svelte/icons/plus';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import type { UnidentifiedExpenseSummary } from '$lib/server/api/expenses/getUnidentifiedExpensesHandler';
    import { shallowModal } from '$lib/utils/shallow-modal.svelte';

    const quickLog = shallowModal('quickLog');

    interface Member {
        userId: string;
        displayName: string;
    }

    interface Props {
        vaultId: string;
        members: Member[];
        currentUserId: string;
        formatCurrency: (n: number) => string;
        /** Show the entry-point pill even with zero unidentified, when vault has shared members. */
        hasSharedMembers: boolean;
    }

    let { vaultId, members, currentUserId, formatCurrency, hasSharedMembers }: Props = $props();

    let refetchKey = $state(0);

    const dataResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const r = await ofetch<{
                success: boolean;
                data: { items: UnidentifiedExpenseSummary[]; count: number; totalAmount: number };
            }>(`/api/getUnidentifiedExpenses?vaultId=${id}&limit=3`);
            return r.success ? r.data : { items: [], count: 0, totalAmount: 0 };
        },
    );

    const data = $derived(dataResource.current ?? { items: [], count: 0, totalAmount: 0 });
    const items = $derived(data.items);
    const count = $derived(data.count);
    const totalAmount = $derived(data.totalAmount);

    function memberLabel(userId: string | null): string {
        if (!userId) return 'Vault-level';
        return members.find((m) => m.userId === userId)?.displayName ?? userId;
    }

    function formatRelative(iso: string): string {
        if (!iso) return '';
        const d = new Date(iso);
        const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
        if (days === 0) return 'today';
        if (days === 1) return '1 day ago';
        if (days < 7) return `${days} days ago`;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
</script>

{#if dataResource.loading}
    <div class="h-24 border bg-card animate-pulse mb-3"></div>
{:else if count > 0}
    <div class="mb-3 dg-unid">
        <Card class="dg-unid__card">
            <CardContent class="pt-5">
                <div class="dg-unid__head">
                    <div>
                        <Eyebrow tone="oxblood">— Chapter VI —</Eyebrow>
                        <h2 class="dg-unid__title">
                            <em>Unidentified</em> &amp; in waiting.
                        </h2>
                        <p class="dg-unid__sub">
                            {count} {count === 1 ? 'charge' : 'charges'} totalling
                            <em>{formatCurrency(totalAmount)}</em>.
                        </p>
                    </div>
                    <Button size="sm" variant="almanac-ox" onclick={() => quickLog.push()}>
                        <Plus class="size-3.5" />
                        Quick log
                    </Button>
                </div>
                <Rule />

                <ul class="dg-unid__list">
                    {#each items as item, i (item.id)}
                        <li class="dg-unid__row" class:dg-unid__row--active={i === 0}>
                            <button
                                type="button"
                                onclick={() => goto(`/vaults/${vaultId}/expenses/${item.id}/edit`)}
                                class="dg-unid__btn"
                            >
                                <div class="dg-unid__row-head">
                                    <span class="dg-unid__date">{formatRelative(item.createdAt)}</span>
                                    {#if i === 0}
                                        <Eyebrow tone="oxblood" class="dg-unid__tag">● awaiting claim</Eyebrow>
                                    {/if}
                                </div>
                                <div class="dg-unid__row-body">
                                    <span class="dg-unid__merchant">
                                        <em>Awaiting details</em>
                                    </span>
                                    <span class="dg-unid__amt">{formatCurrency(item.amount)}</span>
                                </div>
                                <p class="dg-unid__meta">
                                    Card &middot; <em>{memberLabel(item.paidBy)}</em>
                                </p>
                            </button>
                        </li>
                    {/each}
                </ul>

                {#if count > items.length}
                    <a
                        href="/vaults/{vaultId}/expenses?status=unidentified"
                        class="dg-unid__more"
                    >
                        Review all {count} &rarr;
                    </a>
                {/if}
            </CardContent>
        </Card>
    </div>
{:else if hasSharedMembers}
    <div class="mb-3">
        <button
            type="button"
            onclick={() => quickLog.push()}
            class="dg-unid__quicklog"
        >
            <Plus class="size-3" />
            Quick log unidentified charge
        </button>
    </div>
{/if}

<style>
    /* Almanac Unidentified card — Chapter VI · in waiting.
       Tokens come from .dg-almanac on (auth) layout root. */

    .dg-unid__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
    }
    .dg-unid__title {
        font-family: 'Fraunces', Georgia, serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 60, 'wght' 380;
        font-size: 1.4rem;
        line-height: 1.1;
        letter-spacing: -0.014em;
        margin: 0.4rem 0 0.2rem;
        color: var(--almanac-ink);
    }
    .dg-unid__title em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-unid__sub {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.9rem;
        color: var(--almanac-ink-2);
        margin: 0;
    }
    .dg-unid__sub em {
        font-style: italic;
        color: var(--almanac-oxblood);
        font-feature-settings: 'tnum';
    }

    .dg-unid__list {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    .dg-unid__row {
        border-bottom: 1px dashed var(--almanac-rule-soft);
    }
    .dg-unid__row:last-child { border-bottom: none; }
    .dg-unid__row--active {
        background: var(--almanac-card);
        border-left: 3px solid var(--almanac-oxblood);
        margin-left: -3px;
    }
    .dg-unid__btn {
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        padding: 0.7rem 0.8rem;
        cursor: pointer;
        display: block;
        color: inherit;
        transition: background 150ms;
    }
    .dg-unid__btn:hover { background: var(--almanac-paper-2); }

    .dg-unid__row-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 0.3rem;
    }
    .dg-unid__date {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--almanac-ink-3);
    }
    :global(.dg-unid__tag) {
        font-size: 0.62rem !important;
    }

    .dg-unid__row-body {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.6rem;
    }
    .dg-unid__merchant {
        font-family: 'Fraunces', serif;
        font-variation-settings: 'opsz' 96, 'SOFT' 30, 'wght' 460;
        font-size: 1.05rem;
        color: var(--almanac-ink);
    }
    .dg-unid__merchant em {
        font-style: italic;
        color: var(--almanac-oxblood);
    }
    .dg-unid__amt {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.95rem;
        font-weight: 600;
        font-feature-settings: 'tnum';
        color: var(--almanac-ink);
    }
    .dg-unid__meta {
        margin: 0.25rem 0 0;
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.82rem;
        color: var(--almanac-ink-3);
    }
    .dg-unid__meta em {
        color: var(--almanac-ink-2);
        font-style: italic;
    }

    .dg-unid__more {
        display: inline-block;
        margin-top: 0.6rem;
        padding: 0 0.8rem;
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.85rem;
        color: var(--almanac-oxblood);
        text-decoration: underline;
        text-underline-offset: 3px;
    }

    .dg-unid__quicklog {
        font-family: 'Newsreader', serif;
        font-style: italic;
        font-size: 0.85rem;
        color: var(--almanac-ink-3);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        text-decoration: underline;
        text-underline-offset: 3px;
    }
    .dg-unid__quicklog:hover { color: var(--almanac-oxblood); }
</style>

<QuickLogModal
    {vaultId}
    {currentUserId}
    {members}
    open={quickLog.open}
    onOpenChange={(o) => quickLog.bind(o)}
    onCreated={() => refetchKey++}
/>
