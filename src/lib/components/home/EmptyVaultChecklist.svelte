<script lang="ts" module>
    export type EmptyVaultChecklistProps = {
        vaultId: string;
        hasFunds: boolean;
        memberCount: number;
        onAddExpense: () => void;
        onCreateFund: () => void;
        onInviteMember: () => void;
        onDismiss: () => void;
    };
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import Check from '@lucide/svelte/icons/check';
    import Receipt from '@lucide/svelte/icons/receipt';
    import Wallet from '@lucide/svelte/icons/wallet';
    import UserPlus from '@lucide/svelte/icons/user-plus';
    import X from '@lucide/svelte/icons/x';
    import type { Component } from 'svelte';

    let {
        hasFunds,
        memberCount,
        onAddExpense,
        onCreateFund,
        onInviteMember,
        onDismiss,
    }: EmptyVaultChecklistProps = $props();

    type Step = {
        id: string;
        label: string;
        sub: string;
        icon: Component;
        done: boolean;
        cta: string;
        action: () => void;
    };

    const steps = $derived<Step[]>([
        {
            id: 'expense',
            label: 'Add your first expense',
            sub: 'Track a single transaction to see how it works.',
            icon: Receipt,
            done: false, // by definition — we render this card only when there are no expenses
            cta: 'Add expense',
            action: onAddExpense,
        },
        {
            id: 'fund',
            label: 'Create a fund',
            sub: 'A budget pool to spend out of (groceries, petrol, etc.).',
            icon: Wallet,
            done: hasFunds,
            cta: hasFunds ? 'Done' : 'Create fund',
            action: onCreateFund,
        },
        {
            id: 'invite',
            label: 'Invite a teammate',
            sub: 'Share the vault with family or coworkers.',
            icon: UserPlus,
            done: memberCount > 1,
            cta: memberCount > 1 ? 'Done' : 'Invite',
            action: onInviteMember,
        },
    ]);
</script>

<section class="rounded-[var(--radius-md)] border border-primary/30 bg-primary/[0.04] overflow-hidden">
    <div class="flex items-start justify-between gap-3 px-4 py-3 border-b border-primary/20">
        <div>
            <h2 class="text-base font-semibold">Welcome — let's get this vault going</h2>
            <p class="text-xs text-muted-foreground mt-0.5">
                Three quick steps to make this vault useful. Skip any you don't need.
            </p>
        </div>
        <button
            type="button"
            onclick={onDismiss}
            aria-label="Dismiss checklist"
            class="shrink-0 inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:bg-accent transition-colors"
        >
            <X class="size-4" />
        </button>
    </div>

    <ul class="divide-y divide-primary/10">
        {#each steps as step (step.id)}
            {@const Icon = step.icon}
            <li class="flex items-center gap-3 px-4 py-3">
                <span
                    class={cn(
                        'inline-flex items-center justify-center size-9 rounded-full shrink-0 transition-colors',
                        step.done ? 'bg-primary text-primary-foreground' : 'bg-background border',
                    )}
                >
                    {#if step.done}
                        <Check class="size-4" />
                    {:else}
                        <Icon class="size-4 text-muted-foreground" />
                    {/if}
                </span>
                <div class="flex-1 min-w-0">
                    <p class={cn('text-sm font-medium', step.done && 'line-through text-muted-foreground')}>
                        {step.label}
                    </p>
                    <p class="text-xs text-muted-foreground truncate">{step.sub}</p>
                </div>
                <button
                    type="button"
                    onclick={step.action}
                    disabled={step.done}
                    class={cn(
                        'shrink-0 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                        step.done
                            ? 'text-muted-foreground'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90',
                    )}
                >
                    {step.cta}
                </button>
            </li>
        {/each}
    </ul>
</section>
