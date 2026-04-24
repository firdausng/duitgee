<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { transferFundsSchema } from '$lib/schemas/funds';
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { CalculatorInput } from '$lib/components/ui/calculator-input';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { ofetch } from 'ofetch';

    let { data } = $props();
    let isLoading = $state(false);

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(transferFundsSchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fill in all required fields correctly');
                return;
            }

            isLoading = true;
            try {
                const response = await ofetch('/api/transferFunds', {
                    method: 'POST',
                    body: form.data,
                    headers: { 'Content-Type': 'application/json' },
                });

                if (response.success === false) {
                    toast.error(response.error || 'Failed to transfer funds');
                    return;
                }

                const { fromFund, toFund, amount } = response.data;
                toast.success(`Transferred ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} from ${fromFund.name} to ${toFund.name}`);
                await goto(`/vaults/${data.vaultId}/funds`);
            } catch (error: any) {
                const msg = error?.data?.error || error?.message || 'Failed to transfer funds. Please try again.';
                toast.error(msg);
            } finally {
                isLoading = false;
            }
        },
    });

    const activeFunds = $derived(data.funds ?? []);

    // Show source fund balance hint
    const fromFundData = $derived(activeFunds.find((f: any) => f.id === $form.fromFundId) ?? null);
    const toFundData = $derived(activeFunds.find((f: any) => f.id === $form.toFundId) ?? null);

    function handleBack() {
        goto(`/vaults/${data.vaultId}/funds`);
    }
</script>

<svelte:head>
    <title>Transfer Funds - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <div class="flex items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold">Transfer Between Funds</h1>
    </div>

    <Card>
        <CardHeader>
            <CardTitle>Transfer Details</CardTitle>
        </CardHeader>
        <CardContent>
            <form method="POST" use:enhance class="space-y-6">
                <input type="hidden" name="vaultId" bind:value={$form.vaultId} />

                <!-- Actions -->
                <div class="flex gap-3">
                    <Button type="button" variant="outline" onclick={handleBack} disabled={$delayed}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={$delayed} class="flex-1">
                        {$delayed ? 'Transferring...' : 'Transfer'}
                    </Button>
                </div>

                <!-- From Fund -->
                <div class="space-y-2">
                    <Label for="fromFundId">From Fund <span class="text-destructive">*</span></Label>
                    <select
                        id="fromFundId"
                        name="fromFundId"
                        bind:value={$form.fromFundId}
                        disabled={$delayed}
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {$errors.fromFundId ? 'border-destructive' : ''}"
                    >
                        <option value="">Select source fund</option>
                        {#each activeFunds as fund}
                            <option value={fund.id}>
                                {fund.name} — Balance: {fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </option>
                        {/each}
                    </select>
                    {#if fromFundData}
                        <p class="text-xs text-muted-foreground">
                            Available: {fromFundData.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    {/if}
                    {#if $errors.fromFundId}
                        <p class="text-sm text-destructive">{$errors.fromFundId}</p>
                    {/if}
                </div>

                <!-- To Fund -->
                <div class="space-y-2">
                    <Label for="toFundId">To Fund <span class="text-destructive">*</span></Label>
                    <select
                        id="toFundId"
                        name="toFundId"
                        bind:value={$form.toFundId}
                        disabled={$delayed}
                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {$errors.toFundId ? 'border-destructive' : ''}"
                    >
                        <option value="">Select destination fund</option>
                        {#each activeFunds.filter((f: any) => f.id !== $form.fromFundId) as fund}
                            <option value={fund.id}>
                                {fund.name} — Balance: {fund.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </option>
                        {/each}
                    </select>
                    {#if $errors.toFundId}
                        <p class="text-sm text-destructive">{$errors.toFundId}</p>
                    {/if}
                </div>

                <!-- Amount -->
                <div class="space-y-2">
                    <Label for="amount">Amount <span class="text-destructive">*</span></Label>
                    <CalculatorInput
                        id="amount"
                        name="amount"
                        bind:value={$form.amount}
                        disabled={$delayed}
                        class={$errors.amount ? 'border-destructive' : ''}
                        error={!!$errors.amount}
                        nextInputId="note"
                    />
                    {#if $errors.amount}
                        <p class="text-sm text-destructive">{$errors.amount}</p>
                    {/if}
                </div>

                <!-- Note -->
                <div class="space-y-2">
                    <Label for="note">Note</Label>
                    <Input
                        id="note"
                        name="note"
                        type="text"
                        bind:value={$form.note}
                        disabled={$delayed}
                        placeholder="Optional note for this transfer"
                    />
                </div>

                <!-- Summary -->
                {#if fromFundData && toFundData && $form.amount > 0}
                    <div class="rounded-lg bg-muted p-4 text-sm space-y-1">
                        <p class="font-medium">Transfer Summary</p>
                        <p class="text-muted-foreground">
                            {fromFundData.name} → {toFundData.name}
                        </p>
                        <p class="text-muted-foreground">
                            Amount: {$form.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        {#if $form.amount > fromFundData.balance}
                            <p class="text-destructive font-medium">
                                ⚠ Insufficient balance in {fromFundData.name}
                            </p>
                        {/if}
                    </div>
                {/if}

                <div class="sm:hidden pb-24"></div>
            </form>
        </CardContent>
    </Card>
</div>

<Toaster />
