<script lang="ts">
    import { goto, invalidateAll } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
    import { Toaster } from '$lib/components/ui/sonner';
    import { toast } from 'svelte-sonner';
    import { ofetch } from 'ofetch';
    import Plus from '@lucide/svelte/icons/plus';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import Check from '@lucide/svelte/icons/check';
    import X from '@lucide/svelte/icons/x';
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';

    let { data } = $props();

    type TagRow = {
        id: string;
        name: string;
        color: string | null;
        isSystem: boolean;
        createdAt: string | null;
        usageCount: number;
    };

    let tags = $state<TagRow[]>(data.tags ?? []);

    let newTagName = $state('');
    let isCreating = $state(false);
    let editingId = $state<string | null>(null);
    let editName = $state('');
    let editColor = $state<string | null>(null);
    let isSaving = $state(false);
    let pendingDeleteId = $state<string | null>(null);

    const canManage = $derived(data.permissions.canEditExpenses);
    const canDelete = $derived(data.permissions.canDeleteExpenses);

    function handleBack() {
        goto(`/vaults/${data.vaultId}`);
    }

    async function handleCreate(e: Event) {
        e.preventDefault();
        const name = newTagName.trim();
        if (!name) return;

        isCreating = true;
        try {
            const response: any = await ofetch('/api/createTag', {
                method: 'POST',
                body: { vaultId: data.vaultId, name },
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.success) {
                toast.error(response.error || 'Could not create tag');
                return;
            }
            tags = [...tags, { ...response.data, usageCount: 0 }].sort((a, b) =>
                a.name.localeCompare(b.name),
            );
            newTagName = '';
            toast.success('Tag created');
        } catch (err: any) {
            toast.error(err?.data?.error || err?.message || 'Could not create tag');
        } finally {
            isCreating = false;
        }
    }

    function startEdit(tag: TagRow) {
        editingId = tag.id;
        editName = tag.name;
        editColor = tag.color;
    }

    function cancelEdit() {
        editingId = null;
        editName = '';
        editColor = null;
    }

    async function saveEdit(tagId: string) {
        const name = editName.trim();
        if (!name) {
            toast.error('Tag name is required');
            return;
        }

        isSaving = true;
        try {
            const response: any = await ofetch('/api/updateTag', {
                method: 'POST',
                body: { id: tagId, vaultId: data.vaultId, name, color: editColor || null },
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.success) {
                toast.error(response.error || 'Could not update tag');
                return;
            }
            tags = tags
                .map((t) => (t.id === tagId ? { ...t, name: response.data.name, color: response.data.color } : t))
                .sort((a, b) => a.name.localeCompare(b.name));
            cancelEdit();
            toast.success('Tag updated');
        } catch (err: any) {
            toast.error(err?.data?.error || err?.message || 'Could not update tag');
        } finally {
            isSaving = false;
        }
    }

    async function handleDelete(tag: TagRow) {
        if (pendingDeleteId !== tag.id) {
            pendingDeleteId = tag.id;
            return;
        }

        try {
            const response: any = await ofetch('/api/deleteTag', {
                method: 'POST',
                body: { id: tag.id, vaultId: data.vaultId },
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.success) {
                toast.error(response.error || 'Could not delete tag');
                return;
            }
            tags = tags.filter((t) => t.id !== tag.id);
            pendingDeleteId = null;
            toast.success('Tag deleted');
        } catch (err: any) {
            toast.error(err?.data?.error || err?.message || 'Could not delete tag');
        }
    }

    const palette = ['#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];
</script>

<svelte:head>
    <title>Tags - DuitGee</title>
</svelte:head>

<Toaster />

<div class="container mx-auto py-2 px-4 max-w-2xl">
    <div class="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onclick={handleBack} aria-label="Back">
            <ArrowLeft class="size-4" />
        </Button>
        <h1 class="text-xl font-semibold">Tags</h1>
    </div>

    <Card class="mb-4">
        <CardHeader>
            <CardTitle>Create a tag</CardTitle>
            <CardDescription>
                Tags are vault-scoped labels you apply to expenses (e.g. <code>kids</code>, <code>work</code>, <code>shared</code>).
            </CardDescription>
        </CardHeader>
        <CardContent>
            {#if canManage}
                <form onsubmit={handleCreate} class="flex gap-2">
                    <Input
                        type="text"
                        placeholder="New tag name..."
                        bind:value={newTagName}
                        disabled={isCreating}
                        class="flex-1"
                    />
                    <Button type="submit" disabled={isCreating || !newTagName.trim()}>
                        <Plus class="size-4" />
                        Create
                    </Button>
                </form>
            {:else}
                <p class="text-sm text-muted-foreground">You don't have permission to create tags in this vault.</p>
            {/if}
        </CardContent>
    </Card>

    <Card>
        <CardHeader>
            <CardTitle>All tags</CardTitle>
            <CardDescription>
                {tags.length} {tags.length === 1 ? 'tag' : 'tags'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {#if tags.length === 0}
                <p class="text-sm text-muted-foreground text-center py-8">
                    No tags yet. Create one above to get started.
                </p>
            {:else}
                <ul class="divide-y">
                    {#each tags as tag (tag.id)}
                        <li class="py-3">
                            {#if editingId === tag.id}
                                <div class="space-y-2">
                                    <div class="flex gap-2">
                                        <Input
                                            type="text"
                                            bind:value={editName}
                                            disabled={isSaving}
                                            class="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="default"
                                            size="sm"
                                            onclick={() => saveEdit(tag.id)}
                                            disabled={isSaving}
                                        >
                                            <Check class="size-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onclick={cancelEdit}
                                            disabled={isSaving}
                                        >
                                            <X class="size-4" />
                                        </Button>
                                    </div>
                                    <div class="flex flex-wrap items-center gap-1.5">
                                        <span class="text-xs text-muted-foreground mr-1">Color:</span>
                                        <button
                                            type="button"
                                            onclick={() => (editColor = null)}
                                            class="size-6 rounded-full border-2 flex items-center justify-center {!editColor ? 'border-foreground' : 'border-transparent'}"
                                            title="No color"
                                        >
                                            <X class="size-3" />
                                        </button>
                                        {#each palette as p}
                                            <button
                                                type="button"
                                                onclick={() => (editColor = p)}
                                                class="size-6 rounded-full border-2 {editColor === p ? 'border-foreground' : 'border-transparent'}"
                                                style="background: {p}"
                                                title={p}
                                                aria-label={p}
                                            ></button>
                                        {/each}
                                    </div>
                                </div>
                            {:else}
                                <div class="flex items-center justify-between gap-3">
                                    <div class="flex items-center gap-2 min-w-0">
                                        {#if tag.color}
                                            <span class="size-3 rounded-full shrink-0" style="background: {tag.color}"></span>
                                        {/if}
                                        <span class="font-medium truncate">{tag.name}</span>
                                        <span class="text-xs text-muted-foreground shrink-0">
                                            · {tag.usageCount} {tag.usageCount === 1 ? 'use' : 'uses'}
                                        </span>
                                    </div>
                                    {#if canManage}
                                        <div class="flex items-center gap-1 shrink-0">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onclick={() => startEdit(tag)}
                                                aria-label="Edit"
                                            >
                                                <Pencil class="size-3.5" />
                                            </Button>
                                            {#if canDelete}
                                                <Button
                                                    type="button"
                                                    variant={pendingDeleteId === tag.id ? 'destructive' : 'ghost'}
                                                    size="sm"
                                                    onclick={() => handleDelete(tag)}
                                                    aria-label={pendingDeleteId === tag.id ? 'Confirm delete' : 'Delete'}
                                                >
                                                    <Trash2 class="size-3.5" />
                                                    {#if pendingDeleteId === tag.id}<span class="ml-1 text-xs">Confirm</span>{/if}
                                                </Button>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}
        </CardContent>
    </Card>
</div>
