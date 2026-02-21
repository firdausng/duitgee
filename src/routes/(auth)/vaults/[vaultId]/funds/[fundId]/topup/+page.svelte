<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { topUpFundSchema } from '$lib/schemas/funds';
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
        validators: valibotClient(topUpFundSchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fill in all required fields correctly');
                return;
            }

            isLoading = true;
            try {
                const response = await ofetch('/api/topUpFund', {
                    method: 'POST',
                    body: form.data,
                    headers: { 'Content-Type': 'application/json' },
                });

                if (response.success === false) {
                    toast.error(response.error || 'Failed to top up fund');
                    return;
                }

                toast.success('Fund topped up successfully');
                await goto(`/vaults/${data.vaultId}/funds/${data.fundId}`);
            } catch (error: any) {
                const msg = error?.data?.error || error?.message || 'Failed to top up fund. Please try again.';
                toast.error(msg);
            } finally {
                isLoading = false;
            }
        },
    });

    function handleBack() {
        goto(`/vaults/${data.vaultId}/funds/${data.fundId}`);
    }
</script>

<svelte:head>
    <title>Top Up Fund - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <div class="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onclick={handleBack}>← Back</Button>
        <h1 class="text-2xl font-bold">Top Up Fund</h1>
    </div>

    <Card>
        <CardHeader>
            <CardTitle>Add Money to Fund</CardTitle>
        </CardHeader>
        <CardContent>
            <form method="POST" use:enhance class="space-y-6">
                <input type="hidden" name="id" bind:value={$form.id} />
                <input type="hidden" name="vaultId" bind:value={$form.vaultId} />

                <!-- Actions -->
                <div class="flex gap-3">
                    <Button type="button" variant="outline" onclick={handleBack} disabled={$delayed}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={$delayed} class="flex-1">
                        {$delayed ? 'Adding...' : 'Top Up'}
                    </Button>
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
                        placeholder="Optional note for this top-up"
                    />
                </div>

                <div class="sm:hidden pb-24"></div>
            </form>
        </CardContent>
    </Card>
</div>

<Toaster />
