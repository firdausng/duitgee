<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import {
        createIncomeEntrySchema,
        createIncomeEntryWithSourceSchema,
    } from '$lib/schemas/income';
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { CalculatorInput } from '$lib/components/ui/calculator-input';
    import { DateTimePicker } from '$lib/components/ui/date-time-picker';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { localDatetimeToUtcIso } from '$lib/utils';
    import Plus from '@lucide/svelte/icons/plus';

    let { data } = $props();

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(createIncomeEntrySchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fix the highlighted fields');
                return;
            }

            try {
                if (mode === 'new-source') {
                    // Combined create — new source + new entry in one batch.
                    if (!newSourceName.trim()) {
                        toast.error('Enter a name for the new source');
                        return;
                    }
                    const payload = {
                        vaultId: data.vaultId,
                        sourceName: newSourceName.trim(),
                        sourceIcon: newSourceIcon || '💰',
                        amount: form.data.amount,
                        date: localDatetimeToUtcIso(form.data.date),
                        paidTo: form.data.paidTo,
                        note: form.data.note,
                        fundId: form.data.fundId,
                    };
                    const response = await ofetch('/api/createIncomeEntryWithSource', {
                        method: 'POST',
                        body: payload,
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (response.success === false) {
                        toast.error(response.error || 'Failed to create');
                        return;
                    }
                    toast.success('Income recorded · new source created');
                } else {
                    const payload = {
                        ...form.data,
                        date: localDatetimeToUtcIso(form.data.date),
                    };
                    const response = await ofetch('/api/createIncomeEntry', {
                        method: 'POST',
                        body: payload,
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (response.success === false) {
                        toast.error(response.error || 'Failed to create');
                        return;
                    }
                    toast.success('Income recorded');
                }
                await goto(`/vaults/${data.vaultId}/income`);
            } catch (error: any) {
                toast.error(error?.data?.error || error?.message || 'Failed to record income');
            }
        },
    });

    type Mode = 'existing-source' | 'new-source' | 'ad-hoc';
    // Default to existing-source when any sources exist, otherwise prompt for new.
    let mode = $state<Mode>(data.sources.length > 0 ? 'existing-source' : 'new-source');
    let newSourceName = $state('');
    let newSourceIcon = $state('💰');

    function pickSource(sourceId: string) {
        const src = data.sources.find((s) => s.id === sourceId);
        if (!src) return;
        $form.sourceId = src.id;
        // Pre-fill from source defaults when fields are unset.
        if (!$form.amount && src.defaultAmount) $form.amount = src.defaultAmount;
        if (!$form.paidTo && src.defaultPaidTo) $form.paidTo = src.defaultPaidTo;
        if (!$form.fundId && src.defaultFundId) $form.fundId = src.defaultFundId;
        if (!$form.note && src.defaultNote) $form.note = src.defaultNote;
    }

    function handleBack() {
        goto(`/vaults/${data.vaultId}/income`);
    }
</script>

<svelte:head>
    <title>New Income - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <header class="mb-2">
        <Eyebrow tone="muted">Plate § New income</Eyebrow>
        <h1 class="dg-page-title">A new <em>income</em> entry.</h1>
        <p class="dg-page-sub">Money arriving — salary, side income, refund, gift.</p>
    </header>
    <Rule variant="double" />
    <div class="mb-6"></div>

    <Card>
        <CardHeader>
            <CardTitle>Income</CardTitle>
            <CardDescription>
                Pick an existing source or create a new one. Optionally route the amount into a fund as a top-up.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form method="POST" use:enhance class="space-y-6">
                <input type="hidden" name="vaultId" bind:value={$form.vaultId} />

                <!-- Mode toggle -->
                <div class="space-y-2">
                    <Label>Source</Label>
                    <div class="inline-flex rounded-md border overflow-hidden" role="group" aria-label="Source mode">
                        <button
                            type="button"
                            onclick={() => { mode = 'existing-source'; }}
                            disabled={$delayed || data.sources.length === 0}
                            class="px-3 py-1.5 text-xs {mode === 'existing-source' ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}"
                        >
                            Existing
                        </button>
                        <button
                            type="button"
                            onclick={() => { mode = 'new-source'; $form.sourceId = null; }}
                            disabled={$delayed}
                            class="px-3 py-1.5 text-xs border-l {mode === 'new-source' ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}"
                        >
                            <Plus class="size-3 inline -mt-0.5" /> New source
                        </button>
                        <button
                            type="button"
                            onclick={() => { mode = 'ad-hoc'; $form.sourceId = null; }}
                            disabled={$delayed}
                            class="px-3 py-1.5 text-xs border-l {mode === 'ad-hoc' ? 'bg-muted text-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}"
                        >
                            Ad-hoc (no source)
                        </button>
                    </div>
                </div>

                {#if mode === 'existing-source'}
                    {#if data.sources.length === 0}
                        <p class="text-xs text-muted-foreground">No sources yet — switch to "New source" to create one.</p>
                    {:else}
                        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {#each data.sources as src}
                                <button
                                    type="button"
                                    onclick={() => pickSource(src.id)}
                                    disabled={$delayed}
                                    class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                        {$form.sourceId === src.id ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1' : 'border-input'}"
                                >
                                    <span class="text-xl">{src.icon ?? '💰'}</span>
                                    <span class="leading-tight line-clamp-2">{src.name}</span>
                                </button>
                            {/each}
                        </div>
                    {/if}
                {:else if mode === 'new-source'}
                    <div class="grid gap-3 sm:grid-cols-[1fr_120px]">
                        <div class="space-y-2">
                            <Label for="newSourceName">New source name <span class="text-destructive">*</span></Label>
                            <Input
                                id="newSourceName"
                                bind:value={newSourceName}
                                disabled={$delayed}
                                placeholder="e.g., Salary - Firdaus"
                            />
                        </div>
                        <div class="space-y-2">
                            <Label for="newSourceIcon">Icon</Label>
                            <Input
                                id="newSourceIcon"
                                bind:value={newSourceIcon}
                                disabled={$delayed}
                                placeholder="💰"
                            />
                        </div>
                    </div>
                {/if}

                <!-- Amount -->
                <div class="space-y-2">
                    <Label for="amount">Amount <span class="text-destructive">*</span></Label>
                    <CalculatorInput
                        id="amount"
                        name="amount"
                        bind:value={$form.amount}
                        disabled={$delayed}
                        placeholder="0.00"
                        error={!!$errors.amount}
                    />
                    {#if $errors.amount}
                        <p class="text-sm text-destructive">{$errors.amount}</p>
                    {/if}
                </div>

                <!-- Date -->
                <div class="space-y-2">
                    <Label for="date">Date <span class="text-destructive">*</span></Label>
                    <DateTimePicker
                        id="date"
                        name="date"
                        bind:value={$form.date}
                        disabled={$delayed}
                        showTime={false}
                    />
                    {#if $errors.date}
                        <p class="text-sm text-destructive">{$errors.date}</p>
                    {/if}
                </div>

                <!-- Paid to -->
                <div class="space-y-2">
                    <Label>Paid to</Label>
                    <input type="hidden" name="paidTo" value={$form.paidTo ?? ''} />
                    <div class="grid grid-cols-3 gap-1">
                        <button
                            type="button"
                            onclick={() => ($form.paidTo = null)}
                            disabled={$delayed}
                            class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                {!$form.paidTo ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                        >
                            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-base">—</span>
                            <span class="leading-tight">Vault-level</span>
                        </button>
                        {#each data.members as member}
                            <button
                                type="button"
                                onclick={() => ($form.paidTo = member.userId)}
                                disabled={$delayed}
                                class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                    {$form.paidTo === member.userId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                            >
                                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                    {member.displayName.charAt(0).toUpperCase()}
                                </span>
                                <span class="leading-tight line-clamp-2">{member.displayName}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Fund routing -->
                {#if data.funds.length > 0}
                    <div class="space-y-2">
                        <Label>Top up a fund (optional)</Label>
                        <input type="hidden" name="fundId" value={$form.fundId ?? ''} />
                        <div class="grid grid-cols-3 gap-1">
                            <button
                                type="button"
                                onclick={() => ($form.fundId = null)}
                                disabled={$delayed}
                                class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                    {!$form.fundId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                            >
                                <span class="text-xl">—</span>
                                <span class="leading-tight">No fund</span>
                            </button>
                            {#each data.funds as fund}
                                <button
                                    type="button"
                                    onclick={() => ($form.fundId = fund.id)}
                                    disabled={$delayed}
                                    class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                        {$form.fundId === fund.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                                >
                                    <span class="text-xl">{fund.icon ?? '💰'}</span>
                                    <span class="leading-tight line-clamp-2">{fund.name}</span>
                                </button>
                            {/each}
                        </div>
                        {#if $form.fundId}
                            <p class="text-xs text-muted-foreground">
                                This income will appear as a top-up on the chosen fund's balance.
                            </p>
                        {/if}
                    </div>
                {/if}

                <!-- Note -->
                <div class="space-y-2">
                    <Label for="note">Note (optional)</Label>
                    <Textarea
                        id="note"
                        name="note"
                        bind:value={$form.note}
                        disabled={$delayed}
                        placeholder="Optional context"
                        rows={2}
                    />
                </div>

                <!-- Actions -->
                <div class="flex gap-3">
                    <Button type="button" variant="outline" onclick={handleBack} disabled={$delayed}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={$delayed} class="flex-1">
                        {$delayed ? 'Recording…' : 'Record income'}
                    </Button>
                </div>
            </form>
        </CardContent>
    </Card>
</div>

<Toaster />
