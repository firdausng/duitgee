<script lang="ts" module>
    export interface TransferSheetFund {
        id: string;
        name: string;
        icon?: string | null;
        balance: number;
        status: string;
    }

    export interface TransferSheetProps {
        open: boolean;
        vaultId: string;
        fromFundId: string;
        funds: TransferSheetFund[];
        formatCurrency: (amount: number) => string;
        onOpenChange: (open: boolean) => void;
        onSuccess?: () => void;
    }
</script>

<script lang="ts">
    import { ofetch } from 'ofetch';
    import { toast } from 'svelte-sonner';
    import { parse, flatten, type BaseIssue, type BaseSchema } from 'valibot';
    import { transferFundsSchema } from '$lib/schemas/funds';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import {
        Drawer,
        DrawerContent,
        DrawerHeader,
        DrawerTitle,
        DrawerDescription,
        DrawerFooter,
    } from '$lib/components/ui/drawer';

    let {
        open,
        vaultId,
        fromFundId,
        funds,
        formatCurrency,
        onOpenChange,
        onSuccess,
    }: TransferSheetProps = $props();

    let toFundId = $state('');
    let amount = $state<number | ''>('');
    let note = $state('');
    let errors = $state<Record<string, string>>({});
    let submitting = $state(false);

    const fromFund = $derived(funds.find((f) => f.id === fromFundId) ?? null);
    const destinationCandidates = $derived(
        funds.filter((f) => f.status === 'active' && f.id !== fromFundId),
    );
    const toFund = $derived(funds.find((f) => f.id === toFundId) ?? null);
    const numericAmount = $derived(typeof amount === 'number' ? amount : 0);
    const insufficient = $derived(
        fromFund != null && numericAmount > 0 && numericAmount > fromFund.balance,
    );

    // Reset state whenever the sheet closes, so a subsequent open starts fresh.
    $effect(() => {
        if (!open) {
            toFundId = '';
            amount = '';
            note = '';
            errors = {};
            submitting = false;
        }
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        errors = {};

        const payload = {
            vaultId,
            fromFundId,
            toFundId,
            amount: numericAmount,
            note: note || undefined,
        };

        try {
            parse(transferFundsSchema as BaseSchema<any, any, BaseIssue<any>>, payload);
        } catch (err: any) {
            const flat = flatten(err.issues);
            const next: Record<string, string> = {};
            for (const [k, v] of Object.entries(flat.nested ?? {})) {
                if (Array.isArray(v) && v[0]) next[k] = v[0];
            }
            errors = next;
            return;
        }

        if (insufficient) {
            errors = { amount: `Only ${formatCurrency(fromFund?.balance ?? 0)} available in ${fromFund?.name}.` };
            return;
        }

        submitting = true;
        try {
            const response = await ofetch('/api/transferFunds', {
                method: 'POST',
                body: payload,
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.success === false) {
                toast.error(response.error || 'Failed to transfer funds');
                return;
            }
            const { fromFund: f, toFund: t, amount: amt } = response.data;
            toast.success(`Transferred ${formatCurrency(amt)} from ${f.name} to ${t.name}`);
            onOpenChange(false);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.data?.error || err?.message || 'Failed to transfer funds.');
        } finally {
            submitting = false;
        }
    }
</script>

<Drawer {open} {onOpenChange}>
    <DrawerContent>
        <DrawerHeader class="text-left">
            <DrawerTitle>Transfer funds</DrawerTitle>
            <DrawerDescription>
                {#if fromFund}
                    Move balance from <strong>{fromFund.name}</strong> to another active fund in this vault.
                {:else}
                    Move balance to another active fund in this vault.
                {/if}
            </DrawerDescription>
        </DrawerHeader>

        <form onsubmit={handleSubmit} class="px-4 pb-2 space-y-4">
            <!-- From fund (read-only summary) -->
            <div class="rounded-[var(--radius-md)] border bg-muted/40 px-3 py-2">
                <p class="text-xs text-muted-foreground">From</p>
                <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-medium truncate">
                        {#if fromFund?.icon}<span class="mr-1">{fromFund.icon}</span>{/if}
                        {fromFund?.name ?? fromFundId}
                    </p>
                    <p class="font-mono text-sm tabular-nums">
                        {formatCurrency(fromFund?.balance ?? 0)}
                    </p>
                </div>
            </div>

            <!-- To fund -->
            <div class="space-y-1.5">
                <Label for="transfer-to">To fund <span class="text-destructive">*</span></Label>
                <select
                    id="transfer-to"
                    bind:value={toFundId}
                    disabled={submitting}
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {errors.toFundId ? 'border-destructive' : ''}"
                >
                    <option value="">Select destination</option>
                    {#each destinationCandidates as fund (fund.id)}
                        <option value={fund.id}>
                            {fund.icon ? `${fund.icon} ` : ''}{fund.name} — {formatCurrency(fund.balance)}
                        </option>
                    {/each}
                </select>
                {#if errors.toFundId}
                    <p class="text-xs text-destructive">{errors.toFundId}</p>
                {/if}
                {#if destinationCandidates.length === 0}
                    <p class="text-xs text-muted-foreground">
                        No other active funds in this vault.
                    </p>
                {/if}
            </div>

            <!-- Amount -->
            <div class="space-y-1.5">
                <Label for="transfer-amount">Amount <span class="text-destructive">*</span></Label>
                <Input
                    id="transfer-amount"
                    type="number"
                    inputmode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    bind:value={amount}
                    disabled={submitting}
                    class={errors.amount || insufficient ? 'border-destructive' : ''}
                />
                {#if errors.amount}
                    <p class="text-xs text-destructive">{errors.amount}</p>
                {:else if insufficient && fromFund}
                    <p class="text-xs text-destructive">
                        Only {formatCurrency(fromFund.balance)} available in {fromFund.name}.
                    </p>
                {/if}
            </div>

            <!-- Note -->
            <div class="space-y-1.5">
                <Label for="transfer-note">Note</Label>
                <Input
                    id="transfer-note"
                    type="text"
                    bind:value={note}
                    disabled={submitting}
                    placeholder="Optional"
                />
            </div>

            <!-- Summary -->
            {#if toFund && numericAmount > 0 && !insufficient}
                <p class="text-xs text-muted-foreground">
                    Moving <span class="font-mono tabular-nums">{formatCurrency(numericAmount)}</span>
                    from <strong>{fromFund?.name}</strong> to <strong>{toFund.name}</strong>.
                </p>
            {/if}
        </form>

        <DrawerFooter>
            <div class="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    class="flex-1"
                    onclick={() => onOpenChange(false)}
                    disabled={submitting}
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    class="flex-1"
                    onclick={handleSubmit}
                    disabled={submitting || destinationCandidates.length === 0}
                >
                    {submitting ? 'Transferring…' : 'Transfer'}
                </Button>
            </div>
        </DrawerFooter>
    </DrawerContent>
</Drawer>
