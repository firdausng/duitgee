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
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { DateTimePicker } from '$lib/components/ui/date-time-picker';
    import { localDatetimeToUtcIso, utcToLocalDatetimeString } from '$lib/utils';
    import { resolveBreakdown, type BreakdownLineLike } from '$lib/utils/breakdown';

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
        template: {
            name: string | null;
            icon: string | null;
            defaultAmount: number | null;
            defaultAllowances: string | null;
            defaultDeductions: string | null;
        };
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

    function parseLines(raw: string | null): BreakdownLineLike[] {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? (parsed as BreakdownLineLike[]) : [];
        } catch {
            return [];
        }
    }

    /** Net take-home after the template's deductions (with allowances added
     *  back into the base first). null when the rule has no breakdown. */
    function effectiveNet(r: Rule): number | null {
        const base = effectiveAmount(r);
        if (base <= 0) return null;
        const allowances = parseLines(r.template.defaultAllowances);
        const deductions = parseLines(r.template.defaultDeductions);
        if (allowances.length === 0 && deductions.length === 0) return null;
        return resolveBreakdown(base, allowances, deductions).net;
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

    // ── Approve-with-edits flow ──────────────────────────────────────────
    // Lets the user tweak amount, date or note before materializing the
    // income entry. The new date propagates to linked deduction expenses too
    // (handled server-side in approvePendingIncomeOccurrenceHandler).
    let approveTarget = $state<Pending | null>(null);
    let approveAmount = $state('');
    let approveDate = $state('');
    let approveNote = $state('');
    let approving = $state(false);

    function openApprove(occ: Pending) {
        approveTarget = occ;
        approveAmount = String(occ.suggestedAmount);
        approveDate = utcToLocalDatetimeString(occ.dueDate);
        approveNote = '';
    }
    function cancelApprove() {
        approveTarget = null;
    }
    async function confirmApprove() {
        if (!approveTarget) return;
        const amountNum = Number(approveAmount);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }
        if (!approveDate) {
            toast.error('Date is required');
            return;
        }
        approving = true;
        try {
            const trimmedNote = approveNote.trim();
            await ofetch('/api/approvePendingIncomeOccurrence', {
                method: 'POST',
                body: {
                    vaultId,
                    occurrenceId: approveTarget.id,
                    amountOverride: amountNum,
                    dateOverride: localDatetimeToUtcIso(approveDate),
                    noteOverride: trimmedNote.length > 0 ? trimmedNote : undefined,
                },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Income recorded');
            approveTarget = null;
            refetchKey++;
        } catch (e: any) {
            toast.error(e?.data?.error || e?.message || 'Failed to approve');
        } finally {
            approving = false;
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
                            <button type="button" onclick={() => call('/api/approvePendingIncomeOccurrence', { vaultId, occurrenceId: occ.id }, 'Income recorded')} class="p-1.5 rounded-[var(--radius-sm)] hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Approve at suggested amount" aria-label="Approve at suggested amount">
                                <Check class="size-4" />
                            </button>
                            <button type="button" onclick={() => openApprove(occ)} class="p-1.5 rounded-[var(--radius-sm)] hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Approve with edits — adjust amount, date, or note" aria-label="Approve with edits">
                                <Pencil class="size-4" />
                            </button>
                            <button type="button" onclick={() => call('/api/skipPendingIncomeOccurrence', { vaultId, occurrenceId: occ.id }, 'Skipped')} class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground" title="Skip" aria-label="Skip">
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
            {@const net = effectiveNet(r)}
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
                        {#if net !== null && net !== effectiveAmount(r)}
                            <span class="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-mono tabular-nums align-middle ml-1 text-emerald-700 dark:text-emerald-400">
                                Net {fmt.currency(net)}
                            </span>
                        {/if}
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

{#if approveTarget}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-income-edits-title"
    >
        <button
            type="button"
            class="fixed inset-0 bg-black/50"
            onclick={cancelApprove}
            aria-label="Close"
        ></button>
        <div class="relative z-10 w-full max-w-md rounded-[var(--radius-md)] border bg-card shadow-lg">
            <div class="p-5 space-y-4">
                <div class="space-y-1">
                    <h3 id="approve-income-edits-title" class="text-base font-semibold">
                        Approve with edits
                    </h3>
                    <p class="text-xs text-muted-foreground">
                        {approveTarget.ruleName || approveTarget.templateName || 'Recurring income'}
                        <span class="opacity-50">·</span> Suggested {fmt.currency(approveTarget.suggestedAmount)}
                    </p>
                    <p class="text-[11px] text-muted-foreground">
                        Amount becomes the base — allowances and deductions recompute from it.
                    </p>
                </div>

                <div class="space-y-2">
                    <Label for="approve-income-amount">Base amount</Label>
                    <Input
                        id="approve-income-amount"
                        type="number"
                        inputmode="decimal"
                        step="0.01"
                        min="0"
                        bind:value={approveAmount}
                        disabled={approving}
                    />
                </div>

                <div class="space-y-2">
                    <Label for="approve-income-date">Date</Label>
                    <DateTimePicker
                        id="approve-income-date"
                        bind:value={approveDate}
                        disabled={approving}
                        showTime={false}
                    />
                </div>

                <div class="space-y-2">
                    <Label for="approve-income-note">Note (optional)</Label>
                    <Textarea
                        id="approve-income-note"
                        bind:value={approveNote}
                        disabled={approving}
                        placeholder="Leave blank to use the rule's default"
                        rows={2}
                    />
                </div>
            </div>
            <div class="border-t p-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" size="sm" onclick={cancelApprove} disabled={approving}>
                    Cancel
                </Button>
                <Button size="sm" onclick={confirmApprove} disabled={approving}>
                    {approving ? 'Recording…' : 'Record income'}
                </Button>
            </div>
        </div>
    </div>
{/if}

<Toaster />
