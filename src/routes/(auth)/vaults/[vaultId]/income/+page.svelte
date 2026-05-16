<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { EmptyState } from '$lib/components/ui/empty-state';
    import { Amount } from '$lib/components/ui/amount';
    import { Toaster } from '$lib/components/ui/sonner';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { toast } from 'svelte-sonner';
    import { createVaultFormatters } from '$lib/vaultFormatting';
    import type { VaultWithMember } from '$lib/schemas/read/vaultWithMember';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import Plus from '@lucide/svelte/icons/plus';
    import MoreVertical from '@lucide/svelte/icons/more-vertical';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import Wallet from '@lucide/svelte/icons/wallet';
    import TrendingUp from '@lucide/svelte/icons/trending-up';
    import Tags from '@lucide/svelte/icons/tags';
    import FileText from '@lucide/svelte/icons/file-text';

    const vaultId = $derived(page.params.vaultId);

    type IncomeEntry = {
        id: string;
        vaultId: string;
        templateId: string | null;
        sourceId: string | null;
        amount: number;
        baseAmount: number | null;
        allowances: string | null;   // JSON-stringified array
        deductions: string | null;   // JSON-stringified array
        date: string;
        paidTo: string | null;
        note: string | null;
        fundId: string | null;
        template: { name: string | null; icon: string | null } | null;
        source: { name: string | null; icon: string | null } | null;
    };

    // Parse breakdown JSON and sum the computed amounts. Returns 0 when null/empty.
    function sumBreakdown(raw: string | null): number {
        if (!raw) return 0;
        try {
            const parsed = JSON.parse(raw) as Array<{ computedAmount?: number }>;
            if (!Array.isArray(parsed)) return 0;
            return Math.round(parsed.reduce((s, l) => s + (l.computedAmount ?? 0), 0) * 100) / 100;
        } catch {
            return 0;
        }
    }

    let refetchKey = $state(0);

    const vaultResource = resource(
        () => vaultId,
        async (id) => {
            const res = await ofetch<{ success: boolean; data: VaultWithMember }>(
                `/api/getVault?vaultId=${id}`,
            );
            return res.data;
        },
    );

    const entriesResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const res = await ofetch<{ success: boolean; data: IncomeEntry[] }>(
                `/api/getIncomeEntries?vaultId=${id}`,
            );
            return res.data ?? [];
        },
    );

    const fmt = $derived(
        vaultResource.current
            ? createVaultFormatters({
                  locale: vaultResource.current.vaults.locale || 'en-US',
                  currency: vaultResource.current.vaults.currency || 'USD',
              })
            : createVaultFormatters({ locale: 'en-US', currency: 'USD' }),
    );

    const entries = $derived(entriesResource.current ?? []);
    const isLoading = $derived(entriesResource.loading);

    const totalThisPeriod = $derived(
        entries.reduce((sum, e) => sum + e.amount, 0),
    );

    const memberNameById = $derived(() => {
        const map = new Map<string, string>();
        for (const m of vaultResource.current?.members ?? []) {
            map.set(m.userId, m.displayName);
        }
        return map;
    });

    function memberLabel(id: string | null): string {
        if (!id) return 'Vault-level';
        return memberNameById().get(id) ?? id;
    }

    async function handleDelete(entry: IncomeEntry) {
        if (!confirm(`Delete income entry of ${fmt.currency(entry.amount)}?`)) return;
        try {
            await ofetch('/api/deleteIncomeEntry', {
                method: 'POST',
                body: { vaultId, id: entry.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Income entry deleted');
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to delete');
        }
    }
</script>

<svelte:head>
    <title>Income - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4 [&>*+*]:mt-6">
    <div class="flex items-end gap-2 mb-2">
        <header class="flex-1">
            <Eyebrow tone="muted">— The household ledger —</Eyebrow>
            <h1 class="dg-page-title">The <em>income</em> ledger.</h1>
            <p class="dg-page-sub">Money coming in — salary, side income, refunds, gifts.</p>
        </header>
        <div class="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onclick={() => goto(`/vaults/${vaultId}/income/sources`)} title="Manage sources">
                <Tags class="size-4" />
                <span class="hidden sm:inline">Sources</span>
            </Button>
            <Button variant="ghost" size="sm" onclick={() => goto(`/vaults/${vaultId}/income/templates`)} title="Manage templates">
                <FileText class="size-4" />
                <span class="hidden sm:inline">Templates</span>
            </Button>
            <Button size="sm" onclick={() => goto(`/vaults/${vaultId}/income/new`)}>
                <Plus class="size-4" />
                <span>New income</span>
            </Button>
        </div>
    </div>
    <Rule variant="double" />

    {#if entries.length > 0}
        <Card>
            <CardContent class="pt-6">
                <p class="text-xs text-muted-foreground uppercase tracking-wide">Recorded this view</p>
                <Amount
                    value={totalThisPeriod}
                    sign="positive"
                    size="hero"
                    locale={vaultResource.current?.vaults.locale || 'en-US'}
                    currency={vaultResource.current?.vaults.currency || 'USD'}
                />
                <p class="text-xs text-muted-foreground mt-0.5">
                    {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
                </p>
            </CardContent>
        </Card>
    {/if}

    {#if isLoading && entries.length === 0}
        <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full size-10 border-b-2 border-primary"></div>
        </div>
    {:else if entries.length === 0}
        <Card>
            <CardContent class="py-10">
                <EmptyState
                    icon={TrendingUp}
                    title="No income yet"
                    description="Record salary, side income, refunds, gifts, or any other money coming in to see your full cash-flow picture."
                >
                    {#snippet primary()}
                        <Button size="sm" onclick={() => goto(`/vaults/${vaultId}/income/new`)}>
                            <Plus class="size-4" />
                            Record income
                        </Button>
                    {/snippet}
                </EmptyState>
            </CardContent>
        </Card>
    {:else}
        <section>
            <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                {#each entries as entry (entry.id)}
                    <div
                        role="button"
                        tabindex="0"
                        onclick={(e) => {
                            const t = e.target as HTMLElement;
                            if (t.closest('button, [role="menuitem"], [data-no-nav]')) return;
                            goto(`/vaults/${vaultId}/income/${entry.id}/edit`);
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                goto(`/vaults/${vaultId}/income/${entry.id}/edit`);
                            }
                        }}
                        class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                        <span class="text-xl leading-none shrink-0" aria-hidden="true">
                            {entry.template?.icon ?? entry.source?.icon ?? '💰'}
                        </span>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium break-words">
                                {entry.template?.name ?? entry.source?.name ?? 'Ad-hoc income'}
                                {#if entry.source && entry.template}
                                    <span class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide ml-1.5 text-muted-foreground align-middle">
                                        {entry.source.name}
                                    </span>
                                {/if}
                            </p>
                            <p class="text-xs text-muted-foreground mt-0.5">
                                {fmt.date(entry.date)}
                                <span class="opacity-50">·</span>
                                {memberLabel(entry.paidTo)}
                                {#if entry.fundId}
                                    <span class="opacity-50">·</span>
                                    <span class="inline-flex items-center gap-1">
                                        <Wallet class="size-3" />
                                        topped up fund
                                    </span>
                                {/if}
                                {#if entry.note}
                                    <span class="opacity-50">·</span>
                                    <span class="truncate">{entry.note}</span>
                                {/if}
                            </p>
                            {#if sumBreakdown(entry.allowances) > 0 || sumBreakdown(entry.deductions) > 0}
                                {@const allowanceTotal = sumBreakdown(entry.allowances)}
                                {@const deductionTotal = sumBreakdown(entry.deductions)}
                                <p class="text-[11px] mt-0.5 flex gap-1 flex-wrap">
                                    {#if allowanceTotal > 0}
                                        <span class="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-400 font-medium">
                                            +<span class="font-mono">{fmt.currency(allowanceTotal)}</span> allowances
                                        </span>
                                    {/if}
                                    {#if deductionTotal > 0}
                                        <span class="inline-flex items-center rounded-full bg-rose-100 dark:bg-rose-950/40 px-1.5 py-0.5 text-rose-700 dark:text-rose-400 font-medium">
                                            −<span class="font-mono">{fmt.currency(deductionTotal)}</span> deductions
                                        </span>
                                    {/if}
                                </p>
                            {/if}
                        </div>
                        <div class="shrink-0 text-right">
                            <Amount
                                value={entry.amount}
                                sign="positive"
                                showSign={false}
                                formatted={fmt.currency(entry.amount)}
                                size="sm"
                            />
                        </div>
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger
                                class="p-1 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center"
                                aria-label="More actions"
                            >
                                <MoreVertical class="size-4" />
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content align="end" class="min-w-[11rem]">
                                <DropdownMenu.Item onclick={() => goto(`/vaults/${vaultId}/income/${entry.id}/edit`)}>
                                    <Pencil class="size-3.5" />
                                    <span>Edit</span>
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Item destructive onclick={() => handleDelete(entry)}>
                                    <Trash2 class="size-3.5" />
                                    <span>Delete</span>
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </div>
                {/each}
            </div>
        </section>
    {/if}
</div>

<Toaster />
