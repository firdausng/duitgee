<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { EmptyState } from '$lib/components/ui/empty-state';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { Toaster } from '$lib/components/ui/sonner';
    import { IconCombobox } from '$lib/components/ui/icon-combobox';
    import { iconData } from '$lib/configurations/icons';
    import { toast } from 'svelte-sonner';
    import Plus from '@lucide/svelte/icons/plus';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import Tags from '@lucide/svelte/icons/tags';
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';

    const vaultId = $derived(page.params.vaultId);

    type Source = {
        id: string;
        name: string;
        icon: string | null;
    };

    let refetchKey = $state(0);

    const sourcesResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const res = await ofetch<{ success: boolean; data: Source[] }>(
                `/api/getIncomeSources?vaultId=${id}`,
            );
            return res.data ?? [];
        },
    );

    const sources = $derived(sourcesResource.current ?? []);
    const isLoading = $derived(sourcesResource.loading);

    // Inline create / edit row state.
    let editingId = $state<string | null>(null);
    let isCreating = $state(false);
    let formName = $state('');
    let formIcon = $state('💰');
    let saving = $state(false);

    function startCreate() {
        editingId = null;
        isCreating = true;
        formName = '';
        formIcon = '💰';
    }

    function startEdit(s: Source) {
        isCreating = false;
        editingId = s.id;
        formName = s.name;
        formIcon = s.icon ?? '💰';
    }

    function cancelEdit() {
        if (saving) return;
        isCreating = false;
        editingId = null;
    }

    async function saveForm() {
        if (!formName.trim()) {
            toast.error('Enter a name');
            return;
        }
        saving = true;
        try {
            if (isCreating) {
                await ofetch('/api/createIncomeSource', {
                    method: 'POST',
                    body: { vaultId, name: formName.trim(), icon: formIcon },
                    headers: { 'Content-Type': 'application/json' },
                });
                toast.success('Source created');
            } else if (editingId) {
                await ofetch('/api/updateIncomeSource', {
                    method: 'POST',
                    body: { vaultId, id: editingId, name: formName.trim(), icon: formIcon },
                    headers: { 'Content-Type': 'application/json' },
                });
                toast.success('Source updated');
            }
            isCreating = false;
            editingId = null;
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to save');
        } finally {
            saving = false;
        }
    }

    async function handleDelete(s: Source) {
        if (!confirm(`Delete source "${s.name}"? This will also delete every template under it. Existing income entries keep their record but lose the source label.`)) return;
        try {
            await ofetch('/api/deleteIncomeSource', {
                method: 'POST',
                body: { vaultId, id: s.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Source deleted');
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to delete');
        }
    }
</script>

<svelte:head>
    <title>Income Sources - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4 [&>*+*]:mt-6">
    <div class="flex items-end gap-2 mb-2">
        <header class="flex-1">
            <button
                type="button"
                onclick={() => goto(`/vaults/${vaultId}/income`)}
                class="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"
            >
                <ArrowLeft class="size-3" />
                Back to income
            </button>
            <Eyebrow tone="muted">— The household ledger —</Eyebrow>
            <h1 class="dg-page-title">Income <em>sources</em>.</h1>
            <p class="dg-page-sub">Taxonomy of income kinds — Salary, EPF, Refund, Gift, Side-income.</p>
        </header>
        {#if !isCreating && editingId === null}
            <Button size="sm" onclick={startCreate}>
                <Plus class="size-4" />
                <span>New source</span>
            </Button>
        {/if}
    </div>
    <Rule variant="double" />

    {#if isCreating || editingId !== null}
        <Card>
            <CardContent class="py-4 space-y-3">
                <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {isCreating ? 'New source' : 'Edit source'}
                </p>
                <div class="grid gap-3 sm:grid-cols-2">
                    <div class="space-y-1">
                        <Label for="src-name">Name</Label>
                        <Input id="src-name" bind:value={formName} disabled={saving} placeholder="e.g., Salary" />
                    </div>
                    <IconCombobox
                        name="src-icon"
                        label="Icon"
                        icons={iconData.icons}
                        bind:value={formIcon}
                        disabled={saving}
                        placeholder="Search icons..."
                    />
                </div>
                <div class="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onclick={cancelEdit} disabled={saving}>Cancel</Button>
                    <Button size="sm" onclick={saveForm} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                </div>
            </CardContent>
        </Card>
    {/if}

    {#if isLoading && sources.length === 0}
        <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full size-10 border-b-2 border-primary"></div>
        </div>
    {:else if sources.length === 0 && !isCreating}
        <Card>
            <CardContent class="py-10">
                <EmptyState
                    icon={Tags}
                    title="No sources yet"
                    description="Sources are the small taxonomy of income kinds (Salary, EPF, Refund). Create one to start recording income."
                >
                    {#snippet primary()}
                        <Button size="sm" onclick={startCreate}>
                            <Plus class="size-4" />
                            New source
                        </Button>
                    {/snippet}
                </EmptyState>
            </CardContent>
        </Card>
    {:else}
        <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
            {#each sources as src (src.id)}
                <div class="flex items-center gap-3 px-3 py-2.5">
                    <span class="text-xl leading-none shrink-0" aria-hidden="true">{src.icon ?? '💰'}</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium">{src.name}</p>
                    </div>
                    <button
                        type="button"
                        onclick={() => startEdit(src)}
                        class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground"
                        aria-label="Edit"
                        title="Edit"
                    >
                        <Pencil class="size-4" />
                    </button>
                    <button
                        type="button"
                        onclick={() => handleDelete(src)}
                        class="p-1.5 rounded-[var(--radius-sm)] hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                        title="Delete"
                    >
                        <Trash2 class="size-4" />
                    </button>
                </div>
            {/each}
        </div>
    {/if}
</div>

<Toaster />
