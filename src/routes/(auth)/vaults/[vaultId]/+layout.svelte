<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { FloatingActionButton } from "$lib/components/ui/floating-action-button";
    import { setContext } from 'svelte';
    import { SvelteSet } from 'svelte/reactivity';

    let { children, data } = $props();

    let {vaultId} = page.params

    function handleNewExpense() {
        goto(`/vaults/${vaultId}/expenses/new`);
    }

    // Check if we're on the statistics page to adjust button position
    let isStatisticsPage = $derived(page.url.pathname.includes('/statistics'));

    let fabItems = new SvelteSet();
    fabItems.add({
        label: 'Add Expense',
        onClick: handleNewExpense
    });
</script>

<div class="relative">
    <div>
        {@render children?.()}
    </div>

    {#each fabItems as fab}
        <!-- Floating Action Button -->
        <FloatingActionButton
                onclick={fab.onClick}
                class={isStatisticsPage ? 'bottom-[calc(7rem+env(safe-area-inset-bottom))] sm:bottom-[7rem]' : ''}
        >
            {#snippet icon()}
                <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-5 h-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                >
                    <path
                            fill-rule="evenodd"
                            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                            clip-rule="evenodd"
                    />
                </svg>
            {/snippet}
            {fab.label}
        </FloatingActionButton>
    {/each}

</div>
