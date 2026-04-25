<script lang="ts">
    import { ofetch } from 'ofetch';
    import { Button } from '$lib/components/ui/button';
    import { CalculatorInput } from '$lib/components/ui/calculator-input';
    import { Label } from '$lib/components/ui/label';
    import { toast } from 'svelte-sonner';

    interface Member {
        userId: string;
        displayName: string;
    }

    interface Props {
        vaultId: string;
        currentUserId: string;
        open: boolean;
        /** Optional pre-loaded members. When omitted, the modal fetches them lazily. */
        members?: Member[];
        /** Called after a successful create with the new expense id. */
        onCreated?: (id: string) => void;
        /** Called when the user dismisses (Cancel / overlay click / Esc). */
        onClose?: () => void;
    }

    let {
        vaultId,
        currentUserId,
        open = $bindable(false),
        members,
        onCreated,
        onClose,
    }: Props = $props();

    let amount = $state<number | null>(null);
    let paidBy = $state<string | null>(currentUserId);
    let submitting = $state(false);

    /** Lazily-loaded members when none were provided as props. */
    let fetchedMembers = $state<Member[]>([]);
    let membersLoading = $state(false);

    const effectiveMembers = $derived(members ?? fetchedMembers);
    const showMemberPicker = $derived(effectiveMembers.length > 1);

    // Reset form on open. Lazy-fetch members if needed.
    $effect(() => {
        if (!open) return;
        amount = null;
        paidBy = currentUserId;

        if (members === undefined && fetchedMembers.length === 0 && !membersLoading) {
            membersLoading = true;
            ofetch<{ success: boolean; data: { members: Member[] } }>(`/api/getVault?vaultId=${vaultId}`)
                .then((r) => {
                    if (r.success) fetchedMembers = r.data.members ?? [];
                })
                .catch((err) => console.warn('Failed to fetch members for quick log:', err))
                .finally(() => {
                    membersLoading = false;
                });
        }
    });

    function close() {
        if (submitting) return;
        open = false;
        onClose?.();
    }

    async function submit() {
        if (!amount || amount <= 0) {
            toast.error('Enter an amount greater than 0');
            return;
        }
        submitting = true;
        try {
            const r = await ofetch<{ success: boolean; data?: { id: string }; error?: string }>(
                '/api/createUnidentifiedExpense',
                {
                    method: 'POST',
                    body: { vaultId, amount, paidBy },
                    headers: { 'Content-Type': 'application/json' },
                },
            );
            if (!r.success || !r.data) {
                toast.error(r.error || 'Failed to log');
                return;
            }
            toast.success('Unidentified charge logged');
            open = false;
            onCreated?.(r.data.id);
        } catch (err) {
            const msg =
                (err as { data?: { error?: string }; message?: string })?.data?.error ??
                (err as { message?: string })?.message ??
                'Failed to log';
            toast.error(msg);
        } finally {
            submitting = false;
        }
    }
</script>

{#if open}
    <div
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-log-title"
        tabindex="-1"
        onclick={(e) => {
            if (e.target === e.currentTarget) close();
        }}
        onkeydown={(e) => {
            if (e.key === 'Escape') close();
        }}
    >
        <div class="w-full max-w-sm rounded-[var(--radius-md)] bg-popover text-popover-foreground border shadow-lg p-5 space-y-4">
            <div>
                <h2 id="quick-log-title" class="text-base font-semibold">Quick log charge</h2>
                <p class="text-sm text-muted-foreground mt-1">
                    Just the amount you saw. Add details later when you remember what it was for.
                </p>
            </div>

            <div class="space-y-3">
                <div class="space-y-1">
                    <Label for="ql-amount">Amount</Label>
                    <CalculatorInput
                        id="ql-amount"
                        name="ql-amount"
                        bind:value={amount}
                        disabled={submitting}
                    />
                </div>

                {#if showMemberPicker}
                    <div class="space-y-1">
                        <Label for="ql-paidby">Paid by</Label>
                        <select
                            id="ql-paidby"
                            bind:value={paidBy}
                            class="w-full h-9 rounded-[var(--radius-sm)] border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value={null}>— Vault-level —</option>
                            {#each effectiveMembers as m (m.userId)}
                                <option value={m.userId}>{m.displayName}</option>
                            {/each}
                        </select>
                    </div>
                {:else if membersLoading}
                    <p class="text-xs text-muted-foreground">Loading vault members…</p>
                {/if}
            </div>

            <div class="flex items-center justify-end gap-2 pt-1">
                <Button variant="ghost" onclick={close} disabled={submitting}>Cancel</Button>
                <Button onclick={submit} disabled={submitting || !amount || amount <= 0}>
                    {submitting ? 'Logging…' : 'Log'}
                </Button>
            </div>
        </div>
    </div>
{/if}
