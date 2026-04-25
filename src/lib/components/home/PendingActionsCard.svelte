<script lang="ts" module>
    export type PendingActionsCardProps = {
        vaultId: string;
        pendingRecurringCount: number;
        pendingReimbursementsCount: number;
        pendingReimbursementsTotal: number;
        formatCurrency: (amount: number) => string;
    };
</script>

<script lang="ts">
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
    import HandCoins from '@lucide/svelte/icons/hand-coins';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';

    let {
        vaultId,
        pendingRecurringCount,
        pendingReimbursementsCount,
        pendingReimbursementsTotal,
        formatCurrency,
    }: PendingActionsCardProps = $props();

    const hasAny = $derived(pendingRecurringCount > 0 || pendingReimbursementsCount > 0);
</script>

{#if hasAny}
    <section class="rounded-[var(--radius-md)] border bg-card overflow-hidden">
        <div class="px-3 sm:px-4 py-2 border-b">
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Needs your attention
            </p>
        </div>
        <ul class="divide-y">
            {#if pendingRecurringCount > 0}
                <li>
                    <a
                        href="/vaults/{vaultId}/recurring"
                        class="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                        <span class="inline-flex items-center justify-center size-9 rounded-full bg-primary/10 shrink-0">
                            <RotateCcw class="size-4 text-primary" />
                        </span>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium truncate">
                                {pendingRecurringCount} pending recurring
                                {pendingRecurringCount === 1 ? 'expense' : 'expenses'}
                            </p>
                            <p class="text-xs text-muted-foreground truncate">
                                Approve or skip them to keep your records up to date.
                            </p>
                        </div>
                        <ArrowRight class="size-4 text-muted-foreground shrink-0" />
                    </a>
                </li>
            {/if}
            {#if pendingReimbursementsCount > 0}
                <li>
                    <a
                        href="/vaults/{vaultId}/reimbursements"
                        class="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                        <span class="inline-flex items-center justify-center size-9 rounded-full bg-amber-500/15 shrink-0">
                            <HandCoins class="size-4 text-amber-600 dark:text-amber-400" />
                        </span>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium truncate">
                                {pendingReimbursementsCount} pending
                                {pendingReimbursementsCount === 1 ? 'reimbursement' : 'reimbursements'}
                                <span class="font-mono tabular-nums text-xs text-muted-foreground">
                                    · {formatCurrency(pendingReimbursementsTotal)}
                                </span>
                            </p>
                            <p class="text-xs text-muted-foreground truncate">
                                Settle to refund the source fund.
                            </p>
                        </div>
                        <ArrowRight class="size-4 text-muted-foreground shrink-0" />
                    </a>
                </li>
            {/if}
        </ul>
    </section>
{/if}
