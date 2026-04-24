<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { updateFundSchema } from '$lib/schemas/funds';
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { CheckboxRow } from '$lib/components/ui/checkbox-row';
    import { IconCombobox } from '$lib/components/ui/icon-combobox';
    import { iconData } from '$lib/configurations/icons';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { FundPolicyLine } from '$lib/components/ui/fund-policy-line';
    import { createVaultFormatters } from '$lib/vaultFormatting';

    let { data } = $props();
    let isLoading = $state(false);

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(updateFundSchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fill in all required fields correctly');
                return;
            }

            isLoading = true;
            try {
                const response = await ofetch('/api/updateFund', {
                    method: 'POST',
                    body: form.data,
                    headers: { 'Content-Type': 'application/json' },
                });

                if (response.success === false) {
                    toast.error(response.error || 'Failed to update fund');
                    return;
                }

                toast.success('Fund updated');
                await goto(`/vaults/${data.vaultId}/funds/${data.fundId}`);
            } catch (error: any) {
                const msg = error?.data?.error || error?.message || 'Failed to update fund. Please try again.';
                toast.error(msg);
            } finally {
                isLoading = false;
            }
        },
    });

    // Carry-over is only relevant for scheduled (non-manual) replenishment types
    const showCarryOver = $derived(data.replenishmentType !== 'manual');

    function handleCarryOverToggle(checked: boolean) {
        if (!checked) {
            $form.carryOverFundId = '';
        }
    }

    // Fetch available funds for carry-over target
    const fundsResource = resource(
        () => data.vaultId,
        async (vaultId) => {
            const response = await ofetch<{ success: boolean; data: any[] }>(`/api/getFunds?vaultId=${vaultId}`);
            return response.data ?? [];
        }
    );

    const carryOverFunds = $derived(
        (fundsResource.current ?? []).filter(
            (f: any) =>
                f.fund.id !== data.fundId &&
                f.fund.status !== 'archived' &&
                f.policy?.replenishmentType !== 'top_to_ceiling'
        )
    );

    const colorOptions = [
        { value: '#3B82F6', label: 'Blue' },
        { value: '#10B981', label: 'Green' },
        { value: '#F59E0B', label: 'Amber' },
        { value: '#EF4444', label: 'Red' },
        { value: '#8B5CF6', label: 'Purple' },
        { value: '#EC4899', label: 'Pink' },
        { value: '#06B6D4', label: 'Cyan' },
        { value: '#6366F1', label: 'Indigo' },
    ];

    function handleBack() {
        goto(`/vaults/${data.vaultId}/funds/${data.fundId}`);
    }

    const vaultFormatters = $derived(
        createVaultFormatters({ locale: data.locale, currency: data.currency }),
    );
</script>

<svelte:head>
    <title>Edit Fund - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <div class="flex items-center gap-3 mb-6">
        <h1 class="text-2xl font-bold">Edit Fund</h1>
    </div>

    {#if data.fundContext && data.policy}
        <div class="mb-4 space-y-1">
            <FundPolicyLine
                fund={data.fundContext}
                cycle={data.activeCycle}
                policy={data.policy}
                formatCurrency={vaultFormatters.currency}
                carryOverFundName={data.carryOverFundName}
            />
            <p class="text-xs text-muted-foreground px-1">
                Replenishment type, amount, and schedule are set at creation and can't be edited here.
                Change them by creating a new fund. Carry-over and metadata below are editable.
            </p>
        </div>
    {/if}

    <Card>
        <CardHeader>
            <CardTitle>Fund Details</CardTitle>
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
                        {$delayed ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>

                <!-- Name -->
                <div class="space-y-2">
                    <Label for="name">Name</Label>
                    <Input
                        id="name"
                        name="name"
                        bind:value={$form.name}
                        disabled={$delayed}
                        placeholder="Fund name"
                        class={$errors.name ? 'border-destructive' : ''}
                    />
                    {#if $errors.name}
                        <p class="text-sm text-destructive">{$errors.name}</p>
                    {/if}
                </div>

                <!-- Description -->
                <div class="space-y-2">
                    <Label for="description">Description</Label>
                    <textarea
                        id="description"
                        name="description"
                        bind:value={$form.description}
                        disabled={$delayed}
                        placeholder="Optional description"
                        rows="2"
                        class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    ></textarea>
                </div>

                <!-- Icon -->
                <IconCombobox
                    name="icon"
                    label="Icon"
                    icons={iconData.icons}
                    bind:value={$form.icon}
                    disabled={$delayed}
                    error={$errors.icon}
                    required={false}
                    placeholder="Search icons..."
                />

                <!-- Color -->
                <div class="space-y-2">
                    <Label>Color</Label>
                    <div class="flex flex-wrap gap-2">
                        {#each colorOptions as color}
                            <button
                                type="button"
                                class="w-9 h-9 rounded-md border-2 transition-all hover:scale-110"
                                class:ring-2={$form.color === color.value}
                                class:ring-ring={$form.color === color.value}
                                class:ring-offset-2={$form.color === color.value}
                                style="background-color: {color.value}"
                                onclick={() => ($form.color = $form.color === color.value ? '' : color.value)}
                                disabled={$delayed}
                                aria-label={color.label}
                            ></button>
                        {/each}
                    </div>
                </div>

                <!-- Carry Over Balance (only for scheduled types) -->
                {#if showCarryOver}
                    <div class="rounded-lg border p-4 space-y-3">
                        <CheckboxRow
                            name="carryOverBalance"
                            bind:checked={$form.carryOverBalance}
                            onCheckedChange={handleCarryOverToggle}
                            disabled={$delayed}
                        >
                            {#snippet label()}Carry over balance{/snippet}
                            {#snippet description()}
                                Transfer remaining balance to another fund when this cycle ends.
                            {/snippet}
                        </CheckboxRow>
                        {#if $form.carryOverBalance}
                            <div class="space-y-2">
                                <Label for="carryOverFundId">Transfer To</Label>
                                {#if fundsResource.loading}
                                    <p class="text-sm text-muted-foreground">Loading funds...</p>
                                {:else if carryOverFunds.length === 0}
                                    <p class="text-sm text-muted-foreground">
                                        No eligible funds available in this vault.
                                    </p>
                                {:else}
                                    <select
                                        id="carryOverFundId"
                                        name="carryOverFundId"
                                        bind:value={$form.carryOverFundId}
                                        disabled={$delayed}
                                        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">Select a fund...</option>
                                        {#each carryOverFunds as f}
                                            <option value={f.fund.id}>
                                                {f.fund.icon} {f.fund.name}
                                            </option>
                                        {/each}
                                    </select>
                                {/if}
                                {#if $form.carryOverBalance && !$form.carryOverFundId}
                                    <p class="text-sm text-destructive">Please select a target fund</p>
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/if}

                <div class="sm:hidden pb-24"></div>
            </form>
        </CardContent>
    </Card>
</div>

<Toaster />
