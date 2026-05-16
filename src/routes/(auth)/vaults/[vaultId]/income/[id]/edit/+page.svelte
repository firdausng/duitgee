<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { updateIncomeEntrySchema } from '$lib/schemas/income';
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { Button } from '$lib/components/ui/button';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { CalculatorInput } from '$lib/components/ui/calculator-input';
    import { DateTimePicker } from '$lib/components/ui/date-time-picker';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { localDatetimeToUtcIso } from '$lib/utils';
    import Trash2 from '@lucide/svelte/icons/trash-2';

    let { data } = $props();

    const { form, errors, enhance, delayed } = superForm(data.form, {
        validators: valibotClient(updateIncomeEntrySchema),
        SPA: true,
        async onUpdate({ form }) {
            if (!form.valid) {
                toast.error('Please fix the highlighted fields');
                return;
            }
            try {
                const payload = {
                    ...form.data,
                    date: form.data.date ? localDatetimeToUtcIso(form.data.date) : undefined,
                };
                const response = await ofetch('/api/updateIncomeEntry', {
                    method: 'POST',
                    body: payload,
                    headers: { 'Content-Type': 'application/json' },
                });
                if (response.success === false) {
                    toast.error(response.error || 'Failed to save');
                    return;
                }
                toast.success('Income entry updated');
                await goto(`/vaults/${data.vaultId}/income`);
            } catch (error: any) {
                toast.error(error?.data?.error || error?.message || 'Failed to save');
            }
        },
    });

    let deleting = $state(false);

    const filteredTemplates = $derived(
        $form.sourceId ? data.templates.filter((t) => t.sourceId === $form.sourceId) : [],
    );

    function pickSource(sourceId: string | null) {
        $form.sourceId = sourceId;
        if ($form.templateId && !data.templates.find((t) => t.id === $form.templateId && t.sourceId === sourceId)) {
            $form.templateId = null;
        }
    }

    function pickTemplate(templateId: string | null) {
        $form.templateId = templateId;
        if (templateId) {
            const tpl = data.templates.find((t) => t.id === templateId);
            if (tpl) $form.sourceId = tpl.sourceId;
        }
    }

    async function handleDelete() {
        if (!confirm('Delete this income entry? If it topped up a fund, that top-up will be reversed.')) return;
        deleting = true;
        try {
            await ofetch('/api/deleteIncomeEntry', {
                method: 'POST',
                body: { vaultId: data.vaultId, id: data.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Income entry deleted');
            await goto(`/vaults/${data.vaultId}/income`);
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to delete');
        } finally {
            deleting = false;
        }
    }
</script>

<svelte:head>
    <title>Edit Income - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <header class="mb-2">
        <Eyebrow tone="muted">Plate § Edit income</Eyebrow>
        <h1 class="dg-page-title">Edit <em>income</em>.</h1>
    </header>
    <Rule variant="double" />
    <div class="mb-6"></div>

    <Card>
        <CardHeader>
            <CardTitle>Income</CardTitle>
        </CardHeader>
        <CardContent>
            <form method="POST" use:enhance class="space-y-6">
                <input type="hidden" name="id" bind:value={$form.id} />
                <input type="hidden" name="vaultId" bind:value={$form.vaultId} />
                <input type="hidden" name="sourceId" value={$form.sourceId ?? ''} />
                <input type="hidden" name="templateId" value={$form.templateId ?? ''} />

                <!-- Source picker -->
                {#if data.sources.length > 0}
                    <div class="space-y-2">
                        <Label>Source</Label>
                        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <button
                                type="button"
                                onclick={() => pickSource(null)}
                                disabled={$delayed}
                                class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                    {!$form.sourceId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                            >
                                <span class="text-xl">—</span>
                                <span class="leading-tight">Ad-hoc</span>
                            </button>
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
                    </div>

                    {#if $form.sourceId && filteredTemplates.length > 0}
                        <div class="space-y-2">
                            <Label>Template</Label>
                            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                <button
                                    type="button"
                                    onclick={() => pickTemplate(null)}
                                    disabled={$delayed}
                                    class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                        {!$form.templateId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-input'}"
                                >
                                    <span class="text-xl">—</span>
                                    <span class="leading-tight">No template</span>
                                </button>
                                {#each filteredTemplates as tpl}
                                    <button
                                        type="button"
                                        onclick={() => pickTemplate(tpl.id)}
                                        disabled={$delayed}
                                        class="flex flex-col items-center gap-1 rounded-md border-2 px-1 py-2 text-center text-xs transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50
                                            {$form.templateId === tpl.id ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1' : 'border-input'}"
                                    >
                                        <span class="text-xl">{tpl.icon ?? '💰'}</span>
                                        <span class="leading-tight line-clamp-2">{tpl.name}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}
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
                        rows={2}
                    />
                </div>

                <!-- Actions -->
                <div class="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onclick={() => goto(`/vaults/${data.vaultId}/income`)} disabled={$delayed}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={$delayed} class="flex-1">
                        {$delayed ? 'Saving…' : 'Save'}
                    </Button>
                </div>

                <div class="flex justify-end pt-4 border-t">
                    <Button type="button" variant="ghost" size="sm" onclick={handleDelete} disabled={deleting || $delayed} class="text-destructive hover:text-destructive">
                        <Trash2 class="size-3.5" />
                        Delete entry
                    </Button>
                </div>
            </form>
        </CardContent>
    </Card>
</div>

<Toaster />
