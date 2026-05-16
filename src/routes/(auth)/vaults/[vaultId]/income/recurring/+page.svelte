<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { EmptyState } from '$lib/components/ui/empty-state';
    import { Amount } from '$lib/components/ui/amount';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { createVaultFormatters } from '$lib/vaultFormatting';
    import type { VaultWithMember } from '$lib/schemas/read/vaultWithMember';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import Plus from '@lucide/svelte/icons/plus';
    import MoreVertical from '@lucide/svelte/icons/more-vertical';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import Pause from '@lucide/svelte/icons/pause';
    import Play from '@lucide/svelte/icons/play';
    import SkipForward from '@lucide/svelte/icons/skip-forward';
    import XCircle from '@lucide/svelte/icons/x-circle';
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import Check from '@lucide/svelte/icons/check';
    import X from '@lucide/svelte/icons/x';

    const vaultId = $derived(page.params.vaultId);

    type Rule = {
        id: string;
        vaultId: string;
        templateId: string;
        name: string | null;
        amountOverride: number | null;
        scheduleUnit: 'day' | 'week' | 'month' | 'year';
        scheduleInterval: number;
        anchorDate: string;
        generationMode: 'auto' | 'queue';
        status: 'active' | 'paused' | 'ended';
        endDate: string | null;
        nextOccurrenceAt: string | null;
        lastGeneratedAt: string | null;
        occurrenceCount: number;
        template: { name: string | null; icon: string | null; defaultAmount: number | null };
    };

    type Pending = {
        id: string;
        recurringIncomeId: string;
        dueDate: string;
        suggestedAmount: number;
        ruleName: string | null;
        templateName: string | null;
        templateIcon: string | null;
    };

    let refetchKey = $state(0);

    const vaultResource = resource(
        () => vaultId,
        async (id) => {
            const res = await ofetch<{ success: boolean; data: VaultWithMember }>(`/api/getVault?vaultId=${id}`);
            return res.data;
        },
    );

    const rulesResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const res = await ofetch<{ success: boolean; data: Rule[] }>(
                `/api/getRecurringIncomes?vaultId=${id}`,
            );
            return res.data ?? [];
        },
    );

    const pendingResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const res = await ofetch<{ success: boolean; data: Pending[] }>(
                `/api/getPendingIncomeOccurrences?vaultId=${id}`,
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

    const rules = $derived(rulesResource.current ?? []);
    const pending = $derived(pendingResource.current ?? []);
    const activeRules = $derived(rules.filter((r) => r.status === 'active'));
    const pausedRules = $derived(rules.filter((r) => r.status === 'paused'));
    const endedRules = $derived(rules.filter((r) => r.status === 'ended'));
    const isLoading = $derived(rulesResource.loading);

    function displayName(r: Rule): string {
        return r.name || r.template.name || 'Recurring income';
    }

    function scheduleLabel(r: Rule): string {
        const unit = r.scheduleInterval === 1 ? r.scheduleUnit : `${r.scheduleInterval} ${r.scheduleUnit}s`;
        return `Every ${unit}`;
    }

    function effectiveAmount(r: Rule): number {
        return r.amountOverride ?? r.template.defaultAmount ?? 0;
    }

    async function call(path: string, body: Record<string, unknown>, okMsg: string) {
        try {
            const res = await ofetch(path, {
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.success === false) {
                toast.error(res.error || 'Failed');
                return;
            }
            toast.success(okMsg);
            refetchKey++;
        } catch (e: any) {
            toast.error(e?.data?.error || e?.message || 'Failed');
        }
    }
</script>

<svelte:head>
    <title>Recurring Income - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4 [&>*+*]:mt-6">
    <div class="flex items-end gap-2 mb-2">
        <header class="flex-1">
            <button
                type="button"
                onclick={() => goto(`/vaults/${vaultId}/income`)}
                class="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"
            >
                <ArrowLeft class="size-3" /> Back to income
            </button>
            <Eyebrow tone="muted">— The household ledger —</Eyebrow>
            <h1 class="dg-page-title">Recurring <em>income</em>.</h1>
            <p class="dg-page-sub">Rules that generate income entries on a schedule — salary, retainers, EPF withdrawals.</p>
        </header>
        <Button size="sm" onclick={() => goto(`/vaults/${vaultId}/income/recurring/new`)}>
            <Plus class="size-4" />
            <span>New rule</span>
        </Button>
    </div>
    <Rule variant="double" />

    {#if pending.length > 0}
        <section>
            <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Pending approvals ({pending.length})
            </h2>
            <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                {#each pending as occ (occ.id)}
                    <div class="flex items-center gap-3 px-3 py-2.5">
                        <span class="text-xl leading-none shrink-0" aria-hidden="true">{occ.templateIcon ?? '💰'}</span>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium break-words">{occ.ruleName ?? occ.templateName ?? 'Recurring income'}</p>
                            <p class="text-xs text-muted-foreground mt-0.5">Due {fmt.date(occ.dueDate)}</p>
                        </div>
                        <div class="shrink-0 text-right">
                            <Amount value={occ.suggestedAmount} sign="positive" showSign={false} formatted={fmt.currency(occ.suggestedAmount)} size="sm" />
                        </div>
                        <div class="flex gap-1 shrink-0">
                            <button type="button" onclick={() => call('/api/approvePendingIncomeOccurrence', { vaultId, occurrenceId: occ.id }, 'Income recorded')} class="p-1.5 rounded-[var(--radius-sm)] hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Approve">
                                <Check class="size-4" />
                            </button>
                            <button type="button" onclick={() => call('/api/skipPendingIncomeOccurrence', { vaultId, occurrenceId: occ.id }, 'Skipped')} class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground" title="Skip">
                                <X class="size-4" />
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    {#if isLoading && rules.length === 0}
        <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full size-10 border-b-2 border-primary"></div>
        </div>
    {:else if rules.length === 0}
        <Card>
            <CardContent class="py-10">
                <EmptyState
                    icon={RotateCcw}
                    title="No recurring income rules yet"
                    description="Set up a rule to auto-generate income entries (e.g. monthly salary)."
                >
                    {#snippet primary()}
                        <Button size="sm" onclick={() => goto(`/vaults/${vaultId}/income/recurring/new`)}>
                            <Plus class="size-4" /> New rule
                        </Button>
                    {/snippet}
                </EmptyState>
            </CardContent>
        </Card>
    {:else}
        {#snippet ruleRow(r: Rule)}
            <div
                role="button"
                tabindex="0"
                onclick={(e) => {
                    const t = e.target as HTMLElement;
                    if (t.closest('button, [role="menuitem"], [data-no-nav]')) return;
                    goto(`/vaults/${vaultId}/income/recurring/${r.id}/edit`);
                }}
                onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goto(`/vaults/${vaultId}/income/recurring/${r.id}/edit`);
                    }
                }}
                class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30"
            >
                <span class="text-xl leading-none shrink-0" aria-hidden="true">{r.template.icon ?? '💰'}</span>
                <div class="flex-1 min-w-0">
                    <p class="font-medium break-words">
                        {displayName(r)}
                        {#if r.status !== 'active'}
                            <span class="inline-flex items-center text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 align-middle ml-1.5 {r.status === 'paused' ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'}">
                                {r.status}
                            </span>
                        {/if}
                        <span class="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-mono tabular-nums align-middle ml-2">
                            {fmt.currency(effectiveAmount(r))}
                        </span>
                    </p>
                    <p class="text-xs text-muted-foreground mt-0.5">
                        {scheduleLabel(r)}
                        <span class="opacity-50">·</span>
                        {r.generationMode === 'auto' ? 'Auto-record' : 'Queue for approval'}
                        {#if r.nextOccurrenceAt && r.status === 'active'}
                            <span class="opacity-50">·</span>
                            Next {fmt.date(r.nextOccurrenceAt)}
                        {/if}
                    </p>
                </div>
                {#if r.status === 'paused'}
                    <button type="button" data-no-nav onclick={(e) => { e.stopPropagation(); call('/api/resumeRecurringIncome', { vaultId, id: r.id }, 'Resumed'); }} class="p-1.5 rounded-[var(--radius-sm)] hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Resume">
                        <Play class="size-3.5" />
                    </button>
                {/if}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        class="p-1 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center"
                        aria-label="More"
                    >
                        <MoreVertical class="size-4" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" class="min-w-[13rem]">
                        <DropdownMenu.Item onclick={() => goto(`/vaults/${vaultId}/income/recurring/${r.id}/edit`)}>
                            <Pencil class="size-3.5" /> <span>Edit</span>
                        </DropdownMenu.Item>
                        {#if r.status === 'active'}
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item onclick={() => call('/api/skipNextIncomeOccurrence', { vaultId, id: r.id }, 'Skipped next')}>
                                <SkipForward class="size-3.5" /> <span>Skip next</span>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onclick={() => call('/api/pauseRecurringIncome', { vaultId, id: r.id }, 'Paused')}>
                                <Pause class="size-3.5" /> <span>Pause</span>
                            </DropdownMenu.Item>
                        {/if}
                        {#if r.status !== 'ended'}
                            <DropdownMenu.Item onclick={() => { if (confirm('Cancel this rule? It will move to Ended and stop generating entries.')) call('/api/cancelRecurringIncome', { vaultId, id: r.id }, 'Cancelled'); }}>
                                <XCircle class="size-3.5" /> <span>Cancel rule…</span>
                            </DropdownMenu.Item>
                        {/if}
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item destructive onclick={() => { if (confirm('Delete this rule? Generated income entries stay as history.')) call('/api/deleteRecurringIncome', { vaultId, id: r.id }, 'Deleted'); }}>
                            <Trash2 class="size-3.5" /> <span>Delete</span>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>
        {/snippet}

        {#if activeRules.length > 0}
            <section>
                <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Active ({activeRules.length})
                </h2>
                <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                    {#each activeRules as r (r.id)}
                        {@render ruleRow(r)}
                    {/each}
                </div>
            </section>
        {/if}
        {#if pausedRules.length > 0}
            <section>
                <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Paused ({pausedRules.length})
                </h2>
                <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden opacity-80">
                    {#each pausedRules as r (r.id)}
                        {@render ruleRow(r)}
                    {/each}
                </div>
            </section>
        {/if}
        {#if endedRules.length > 0}
            <section>
                <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Ended ({endedRules.length})
                </h2>
                <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden opacity-60">
                    {#each endedRules as r (r.id)}
                        {@render ruleRow(r)}
                    {/each}
                </div>
            </section>
        {/if}
    {/if}
</div>

<Toaster />
