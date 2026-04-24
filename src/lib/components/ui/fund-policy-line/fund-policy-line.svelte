<script lang="ts" module>
    import type { CycleLike, FundLike, PolicyLike } from '$lib/utils/fund-summary';

    export interface FundPolicyLineProps {
        fund: FundLike;
        cycle: CycleLike | null | undefined;
        policy: PolicyLike | null | undefined;
        formatCurrency: (amount: number) => string;
        carryOverFundName?: string | null;
        /** Optional Edit handler. If omitted, the Edit button is hidden. */
        onEdit?: () => void;
        class?: string;
    }
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import { policySummary, nextRefillDate, daysUntilPhrase } from '$lib/utils/fund-summary';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';
    import Pencil from '@lucide/svelte/icons/pencil';

    let {
        fund,
        cycle,
        policy,
        formatCurrency,
        carryOverFundName = null,
        onEdit,
        class: className,
    }: FundPolicyLineProps = $props();

    const summary = $derived(policySummary(policy, fund, formatCurrency, carryOverFundName));
    const nextRefill = $derived(nextRefillDate(cycle, policy));
    const refillPhrase = $derived(daysUntilPhrase(nextRefill));
    const refillAbsolute = $derived.by(() => {
        if (!nextRefill) return null;
        return nextRefill.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    });
</script>

<div
    class={cn(
        'flex items-start gap-3 rounded-[var(--radius-md)] border bg-card px-4 py-3',
        className,
    )}
>
    <div class="flex items-center justify-center size-8 rounded-full bg-muted shrink-0 mt-0.5">
        <RefreshCw class="size-4 text-muted-foreground" />
    </div>
    <div class="flex-1 min-w-0">
        <p class="text-sm font-medium">{summary}</p>
        {#if refillPhrase && refillAbsolute}
            <p class="text-xs text-muted-foreground mt-0.5">
                Next refill {refillPhrase}
                <span class="opacity-70">({refillAbsolute})</span>
            </p>
        {/if}
    </div>
    {#if onEdit}
        <button
            type="button"
            onclick={onEdit}
            class="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Edit policy"
            title="Edit fund"
        >
            <Pencil class="size-3" />
            Edit
        </button>
    {/if}
</div>
