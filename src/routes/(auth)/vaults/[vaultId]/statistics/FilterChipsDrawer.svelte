<script lang="ts">
    import {Drawer, DrawerContent, DrawerHeader, DrawerTitle} from "$lib/components/ui/drawer";
    import {cn} from "$lib/utils";

    type FilterOption = {
        id: string;
        name: string;
        icon: string;
        count: number;
    };

    type Props = {
        open: boolean;
        filterOptions: FilterOption[];
        selectedId: string | undefined;
        allExpensesCount: number;
        filterType: 'template' | 'category' | 'member';
        onOpenChange: (open: boolean) => void;
        onSelectAll: () => void;
        onSelectOption: (id: string) => void;
    };

    let {
        open = $bindable(),
        filterOptions,
        selectedId,
        allExpensesCount,
        filterType,
        onOpenChange,
        onSelectAll,
        onSelectOption
    }: Props = $props();

    function getFilterTypeLabel(): string {
        switch (filterType) {
            case 'template': return 'Template';
            case 'category': return 'Category';
            case 'member': return 'Member';
            default: return 'Filter';
        }
    }
</script>

<Drawer bind:open={open}>
    <DrawerContent>
        <DrawerHeader>
            <DrawerTitle>Select {getFilterTypeLabel()}</DrawerTitle>
            <p class="text-sm text-muted-foreground">Filter expenses by {filterType}</p>
        </DrawerHeader>
        <div class="p-4 space-y-4 overflow-y-auto">
            <div class="flex flex-wrap gap-2">
                <button
                    type="button"
                    onclick={onSelectAll}
                    class={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        !selectedId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                    )}
                >
                    All
                    <span class="text-xs opacity-75">({allExpensesCount})</span>
                </button>
                {#each filterOptions as option (option.id)}
                    <button
                        type="button"
                        onclick={() => {
                            if(option.id){
                                onSelectOption(option.id);
                            }
                        }}
                        class={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                            selectedId === option.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80"
                        )}
                    >
                        <span>{option.icon}</span>
                        <span>{option.name}</span>
                        <span class="text-xs opacity-75">({option.count})</span>
                    </button>
                {/each}
            </div>
        </div>
    </DrawerContent>
</Drawer>
