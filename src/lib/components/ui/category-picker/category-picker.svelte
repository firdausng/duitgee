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

    type Category = {
        name: string;
        group: string;
        icon?: string;
        iconType?: string;
    };

    type CategoryGroup = {
        name: string;
        icon?: string;
        color?: string;
    };

    type Props = {
        categories: Category[];
        categoryGroups: CategoryGroup[];
        value?: string;
        disabled?: boolean;
        error?: string | string[];
        label: string;
        required?: boolean;
        name: string;
    };

    let {
        categories,
        categoryGroups,
        value = $bindable(),
        disabled = false,
        error,
        label,
        required = false,
        name,
    }: Props = $props();

    let isOpen = $state(false);
    let searchQuery = $state('');

    const selectedCategory = $derived(categories.find((c) => c.name === value));

    // Build ordered group list from categoryGroups (preserves group order)
    const groupedCategories = $derived(() => {
        const query = searchQuery.trim().toLowerCase();
        const groups: { group: CategoryGroup; categories: Category[] }[] = [];

        for (const group of categoryGroups) {
            const cats = categories.filter((c) => {
                if (c.group !== group.name) return false;
                if (!query) return true;
                return (
                    c.name.toLowerCase().includes(query) ||
                    c.group.toLowerCase().includes(query)
                );
            });
            if (cats.length > 0) {
                groups.push({ group, categories: cats });
            }
        }
        return groups;
    });

    // Reset search when drawer closes
    $effect(() => {
        if (!isOpen) searchQuery = '';
    });

    function openDrawer() {
        if (!disabled) isOpen = true;
    }

    function selectCategory(categoryName: string) {
        value = categoryName;
        isOpen = false;
    }

    function clearValue(e: Event) {
        e.stopPropagation();
        value = '';
    }

    const errorMsg = $derived(Array.isArray(error) ? error[0] : error);
</script>

<div class="space-y-2">
    <Label for={name}>{label}{#if required}<span class="text-destructive ml-1">*</span>{/if}</Label>

    <!-- Hidden input for form submission -->
    <input type="hidden" {name} value={value ?? ''} />

    <!-- Trigger button -->
    <button
        type="button"
        onclick={openDrawer}
        {disabled}
        class={cn(
            'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background text-left',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            errorMsg ? 'border-destructive' : '',
        )}
    >
        {#if selectedCategory}
            {#if selectedCategory.icon}
                <span class="text-lg shrink-0">{selectedCategory.icon}</span>
            {/if}
            <span class="flex-1 truncate">{selectedCategory.name}</span>
            <button
                type="button"
                onclick={clearValue}
                disabled={disabled}
                class="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Clear category"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
            </button>
        {:else}
            <span class="flex-1 text-muted-foreground">Select a category...</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
        {/if}
    </button>

    {#if errorMsg}
        <p class="text-sm text-destructive">{errorMsg}</p>
    {/if}
</div>

<Drawer bind:open={isOpen}>
    <DrawerContent>
        <DrawerHeader class="pb-0 sm:text-center">
            <DrawerTitle>Select Category</DrawerTitle>
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
                        {#if group.icon}<span>{group.icon}</span>{/if}
                        {group.name}
                    </div>
                    <div class="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:justify-center">
                        {#each cats as cat}
                            <button
                                type="button"
                                onclick={() => selectCategory(cat.name)}
                                class={cn(
                                    'flex flex-col items-center gap-2 rounded-md px-1 py-2 text-center text-xs transition-colors sm:w-25 border',
                                    cat.name === value
                                        ? 'bg-primary/10 text-primary font-medium ring-1 ring-primary'
                                        : 'hover:bg-accent'
                                )}
                            >
                                {#if cat.icon}
                                    <span class="text-xl">{cat.icon}</span>
                                {/if}
                                <span class="leading-tight line-clamp-2">{cat.name}</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {:else}
                <p class="text-sm text-muted-foreground text-center py-8">No categories found</p>
            {/each}
        </div>
    </DrawerContent>
</Drawer>
