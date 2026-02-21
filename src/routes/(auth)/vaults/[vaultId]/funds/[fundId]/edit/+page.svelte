<script lang="ts">
    import { superForm } from 'sveltekit-superforms';
    import { valibotClient } from 'sveltekit-superforms/adapters';
    import { updateFundSchema } from '$lib/schemas/funds';
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { ofetch } from 'ofetch';

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
</script>

<svelte:head>
    <title>Edit Fund - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4">
    <div class="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onclick={handleBack}>← Back</Button>
        <h1 class="text-2xl font-bold">Edit Fund</h1>
    </div>

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

                <div class="sm:hidden pb-24"></div>
            </form>
        </CardContent>
    </Card>
</div>

<Toaster />
