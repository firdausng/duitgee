<script lang="ts">
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { QuickLogModal } from '$lib/components/unidentified';
    import HelpCircle from '@lucide/svelte/icons/circle-help';
    import Plus from '@lucide/svelte/icons/plus';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import type { UnidentifiedExpenseSummary } from '$lib/server/api/expenses/getUnidentifiedExpensesHandler';

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
    let modalOpen = $state(false);

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
    <div class="h-24 rounded-lg border bg-card animate-pulse mb-3"></div>
{:else if count > 0}
    <div class="mb-3">
        <Card>
            <CardContent class="pt-5 space-y-3">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <HelpCircle class="size-4 text-muted-foreground shrink-0" />
                        <h2 class="text-sm font-semibold">Unidentified</h2>
                    </div>
                    <Button size="sm" variant="outline" onclick={() => (modalOpen = true)}>
                        <Plus class="size-3.5" />
                        Quick log
                    </Button>
                </div>

                <p class="text-sm text-muted-foreground">
                    {count} {count === 1 ? 'charge' : 'charges'} totalling
                    <span class="font-mono">{formatCurrency(totalAmount)}</span>
                </p>

                <ul class="divide-y -mx-2">
                    {#each items as item (item.id)}
                        <li>
                            <button
                                type="button"
                                onclick={() => goto(`/vaults/${vaultId}/expenses/${item.id}/edit`)}
                                class="w-full px-2 py-2 flex items-center justify-between gap-2 hover:bg-accent rounded text-sm text-left"
                            >
                                <span class="flex flex-col min-w-0">
                                    <span class="font-mono">{formatCurrency(item.amount)}</span>
                                    <span class="text-xs text-muted-foreground truncate">
                                        {memberLabel(item.paidBy)} · {formatRelative(item.createdAt)}
                                    </span>
                                </span>
                                <ArrowRight class="size-4 text-muted-foreground shrink-0" />
                            </button>
                        </li>
                    {/each}
                </ul>

                {#if count > items.length}
                    <a
                        href="/vaults/{vaultId}/expenses?status=unidentified"
                        class="text-xs text-primary hover:underline"
                    >
                        Review all {count} →
                    </a>
                {/if}
            </CardContent>
        </Card>
    </div>
{:else if hasSharedMembers}
    <div class="mb-3">
        <button
            type="button"
            onclick={() => (modalOpen = true)}
            class="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
            <Plus class="size-3" />
            Quick log unidentified charge
        </button>
    </div>
{/if}

<QuickLogModal
    {vaultId}
    {currentUserId}
    {members}
    bind:open={modalOpen}
    onCreated={() => refetchKey++}
/>
