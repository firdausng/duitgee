<script lang="ts" module>
    export type CategoryOption = {
        name: string;
        group: string;
        icon?: string | null;
        iconType?: string | null;
    };

    export type CategoryGroupOption = {
        name: string;
        icon?: string | null;
        iconType?: string | null;
        color?: string;
    };

    export type CategoryMultiPickerProps = {
        categories: CategoryOption[];
        categoryGroups: CategoryGroupOption[];
        /** Selected category names. First entry is treated as the default by callers. */
        value?: string[];
        disabled?: boolean;
        error?: string | string[];
        label: string;
        required?: boolean;
        name: string;
        /** Helper text rendered under the label. */
        hint?: string;
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
    import { IconRenderer } from '$lib/components/ui/icon-renderer';
    import { cn } from '$lib/utils';
    import Plus from '@lucide/svelte/icons/plus';
    import X from '@lucide/svelte/icons/x';
    import Star from '@lucide/svelte/icons/star';

    let {
        categories,
        categoryGroups,
        value = $bindable([]),
        disabled = false,
        error,
        label,
        required = false,
        name,
        hint = 'The first category is the default.',
    }: CategoryMultiPickerProps = $props();

    let isOpen = $state(false);
    let searchQuery = $state('');

    const categoriesByName = $derived(new Map(categories.map((c) => [c.name, c])));
    const selectedCategories = $derived(
        value.map((n) => categoriesByName.get(n)).filter((c): c is CategoryOption => Boolean(c)),
    );

    // Build grouped, filtered list — categories already in `value` are excluded
    // so the drawer always shows additive options.
    const groupedCategories = $derived(() => {
        const query = searchQuery.trim().toLowerCase();
        const groups: { group: CategoryGroupOption; categories: CategoryOption[] }[] = [];

        for (const group of categoryGroups) {
            const cats = categories.filter((c) => {
                if (c.group !== group.name) return false;
                if (value.includes(c.name)) return false;
                if (!query) return true;
                return (
                    c.name.toLowerCase().includes(query) ||
                    c.group.toLowerCase().includes(query)
                );
            });
            if (cats.length > 0) groups.push({ group, categories: cats });
        }
        return groups;
    });

    $effect(() => {
        if (!isOpen) searchQuery = '';
    });

    function openDrawer() {
        if (!disabled) isOpen = true;
    }

    function addCategory(catName: string) {
        if (!value.includes(catName)) {
            value = [...value, catName];
        }
        isOpen = false;
    }

    function removeCategory(catName: string) {
        value = value.filter((n) => n !== catName);
    }

    function makeDefault(catName: string) {
        if (!value.includes(catName)) return;
        value = [catName, ...value.filter((n) => n !== catName)];
    }

    const errorMsg = $derived(Array.isArray(error) ? error[0] : error);
</script>

<div class="space-y-2">
    <Label for={name}>{label}{#if required}<span class="text-destructive ml-1">*</span>{/if}</Label>

    <!-- Hidden input for traditional form submission (comma-joined). -->
    <input type="hidden" {name} value={value.join(',')} />

    <div
        class={cn(
            'flex flex-wrap items-center gap-1.5 min-h-[2.5rem] p-1.5 rounded-md border border-input bg-background',
            errorMsg ? 'border-destructive' : '',
        )}
    >
        {#each selectedCategories as cat, idx (cat.name)}
            {@const isDefault = idx === 0}
            <span
                class={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border',
                    isDefault
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-muted text-foreground border-transparent',
                )}
                title={isDefault ? 'Default for new expenses' : 'Click ★ to make default'}
            >
                {#if cat.icon}
                    <IconRenderer
                        icon={cat.icon}
                        iconType={cat.iconType}
                        size={12}
                        emojiClass="text-xs"
                    />
                {/if}
                <span>{cat.name}</span>

                {#if isDefault}
                    <Star class="size-3 fill-current" />
                {:else}
                    <button
                        type="button"
                        onclick={() => makeDefault(cat.name)}
                        {disabled}
                        class="hover:opacity-70 disabled:opacity-50"
                        aria-label="Make default"
                        title="Make default"
                    >
                        <Star class="size-3" />
                    </button>
                {/if}

                <button
                    type="button"
                    onclick={() => removeCategory(cat.name)}
                    {disabled}
                    class="hover:opacity-70 disabled:opacity-50"
                    aria-label={`Remove ${cat.name}`}
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
            {selectedCategories.length > 0 ? 'Add another' : 'Add category'}
        </button>
    </div>

    {#if hint && !errorMsg}
        <p class="text-xs text-muted-foreground">{hint}</p>
    {/if}
    {#if errorMsg}
        <p class="text-sm text-destructive">{errorMsg}</p>
    {/if}
</div>

<Drawer bind:open={isOpen}>
    <DrawerContent>
        <DrawerHeader class="pb-0 sm:text-center">
            <DrawerTitle>Add a category</DrawerTitle>
        </DrawerHeader>

        <div class="px-4 pb-2 pt-3 sm:max-w-lg sm:mx-auto sm:w-full">
            <Input
                type="text"
                placeholder="Search categories..."
                bind:value={searchQuery}
                class="w-full"
            />
        </div>

        <div class="overflow-y-auto px-4 pb-6" style="max-height: 60vh;">
            {#each groupedCategories() as { group, categories: cats }}
                <div class="mb-4">
                    <div class="flex items-center gap-1.5 px-1 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide sm:justify-center">
                        {#if group.icon}
                            <IconRenderer
                                icon={group.icon}
                                iconType={group.iconType}
                                size={14}
                                emojiClass="text-sm"
                            />
                        {/if}
                        {group.name}
                    </div>
                    <div class="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:justify-center">
                        {#each cats as cat (cat.name)}
                            <button
                                type="button"
                                onclick={() => addCategory(cat.name)}
                                class="flex flex-col items-center gap-2 rounded-md px-1 py-2 text-center text-xs transition-colors sm:w-25 border hover:bg-accent"
                            >
                                {#if cat.icon}
                                    <IconRenderer
                                        icon={cat.icon}
                                        iconType={cat.iconType}
                                        size={22}
                                        emojiClass="text-xl"
                                    />
                                {/if}
                                <span class="leading-tight line-clamp-2">{cat.name}</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {:else}
                <p class="text-sm text-muted-foreground text-center py-8">
                    {searchQuery.trim() ? 'No categories match your search.' : 'All categories already selected.'}
                </p>
            {/each}
        </div>
    </DrawerContent>
</Drawer>
