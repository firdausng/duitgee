<script lang="ts" module>
    export type TagOption = {
        id: string;
        name: string;
        color?: string | null;
    };

    export type TagPickerProps = {
        /** All tags available in this vault. */
        tags: TagOption[];
        /** Currently selected tag IDs. */
        value?: string[];
        /** Optional callback invoked when the user wants to create a new tag.
         * Should persist + return the new tag. The picker auto-selects it on success. */
        onCreate?: (name: string) => Promise<TagOption>;
        disabled?: boolean;
        label?: string;
        name?: string;
        /** Empty state hint inside the drawer. */
        emptyHint?: string;
    };
</script>

<script lang="ts">
    import { Label } from '$lib/components/ui/label';
    import { Input } from '$lib/components/ui/input';
    import {
        Drawer,
        DrawerContent,
        DrawerHeader,
        DrawerTitle,
    } from '$lib/components/ui/drawer';
    import { cn } from '$lib/utils';
    import Plus from '@lucide/svelte/icons/plus';
    import X from '@lucide/svelte/icons/x';
    import Check from '@lucide/svelte/icons/check';

    let {
        tags,
        value = $bindable([]),
        onCreate,
        disabled = false,
        label = 'Tags',
        name,
        emptyHint = 'No tags yet. Type a name above and create your first one.',
    }: TagPickerProps = $props();

    let isOpen = $state(false);
    let searchQuery = $state('');
    let isCreating = $state(false);
    let createError = $state<string | null>(null);

    const tagsById = $derived(new Map(tags.map((t) => [t.id, t])));
    const selectedTags = $derived(value.map((id) => tagsById.get(id)).filter((t): t is TagOption => Boolean(t)));

    const filteredTags = $derived(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return tags;
        return tags.filter((t) => t.name.toLowerCase().includes(query));
    });

    const showCreateOption = $derived.by(() => {
        if (!onCreate) return false;
        const query = searchQuery.trim();
        if (query.length === 0) return false;
        return !tags.some((t) => t.name.toLowerCase() === query.toLowerCase());
    });

    function openDrawer() {
        if (!disabled) {
            isOpen = true;
            createError = null;
        }
    }

    function toggleTag(id: string) {
        if (value.includes(id)) {
            value = value.filter((existing) => existing !== id);
        } else {
            value = [...value, id];
        }
    }

    function removeTag(id: string) {
        value = value.filter((existing) => existing !== id);
    }

    async function handleCreate() {
        if (!onCreate || isCreating) return;
        const trimmed = searchQuery.trim();
        if (!trimmed) return;

        isCreating = true;
        createError = null;
        try {
            const created = await onCreate(trimmed);
            // Auto-select the new tag
            if (!value.includes(created.id)) {
                value = [...value, created.id];
            }
            searchQuery = '';
        } catch (error) {
            createError = error instanceof Error ? error.message : 'Could not create tag';
        } finally {
            isCreating = false;
        }
    }

    $effect(() => {
        if (!isOpen) {
            searchQuery = '';
            createError = null;
        }
    });
</script>

<div class="space-y-2">
    {#if label}
        <Label for={name}>{label}</Label>
    {/if}

    <!-- Hidden input for traditional form submission (comma-joined IDs) -->
    {#if name}
        <input type="hidden" {name} value={value.join(',')} />
    {/if}

    <!-- Selected chips + add button -->
    <div class="flex flex-wrap items-center gap-1.5 min-h-[2.5rem] p-1.5 rounded-md border border-input bg-background">
        {#each selectedTags as tag (tag.id)}
            <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                style={tag.color ? `background-color: ${tag.color}1A; color: ${tag.color}; border-color: ${tag.color}40;` : ''}
            >
                {tag.name}
                <button
                    type="button"
                    onclick={() => removeTag(tag.id)}
                    {disabled}
                    class="hover:opacity-70 disabled:opacity-50"
                    aria-label={`Remove ${tag.name}`}
                >
                    <X class="size-3" />
                </button>
            </span>
        {/each}

        <button
            type="button"
            onclick={openDrawer}
            {disabled}
            class={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border border-dashed text-muted-foreground hover:bg-accent hover:text-foreground',
                'disabled:cursor-not-allowed disabled:opacity-50',
            )}
        >
            <Plus class="size-3" />
            {selectedTags.length > 0 ? 'Add tag' : 'Add tags'}
        </button>
    </div>
</div>

<Drawer bind:open={isOpen}>
    <DrawerContent>
        <DrawerHeader class="pb-0 sm:text-center">
            <DrawerTitle>Tags</DrawerTitle>
        </DrawerHeader>

        <div class="px-4 pb-2 pt-3 sm:max-w-lg sm:mx-auto sm:w-full">
            <Input
                type="text"
                placeholder="Search or type a new tag..."
                bind:value={searchQuery}
                class="w-full"
            />
            {#if createError}
                <p class="text-xs text-destructive mt-1">{createError}</p>
            {/if}
        </div>

        <div class="overflow-y-auto px-4 pb-6 sm:max-w-lg sm:mx-auto sm:w-full" style="max-height: 60vh;">
            {#if showCreateOption}
                <button
                    type="button"
                    onclick={handleCreate}
                    disabled={isCreating}
                    class="w-full text-left px-3 py-2 mb-2 rounded-md border border-dashed border-primary/50 bg-primary/5 text-sm hover:bg-primary/10 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    <Plus class="size-4 text-primary" />
                    <span>Create <span class="font-medium">"{searchQuery.trim()}"</span></span>
                </button>
            {/if}

            {#if filteredTags().length === 0 && !showCreateOption}
                <p class="text-sm text-muted-foreground text-center py-8">{emptyHint}</p>
            {:else}
                <div class="space-y-1">
                    {#each filteredTags() as tag (tag.id)}
                        {@const isSelected = value.includes(tag.id)}
                        <button
                            type="button"
                            onclick={() => toggleTag(tag.id)}
                            class={cn(
                                'w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                                isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-accent',
                            )}
                        >
                            <span class="inline-flex items-center gap-2">
                                {#if tag.color}
                                    <span class="size-2.5 rounded-full" style="background-color: {tag.color}"></span>
                                {/if}
                                {tag.name}
                            </span>
                            {#if isSelected}
                                <Check class="size-4" />
                            {/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </DrawerContent>
</Drawer>
