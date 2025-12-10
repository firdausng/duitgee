<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { Button } from "$lib/components/ui/button";

    let { children, data } = $props();

    let { vaultId } = data;

    function handleNewExpense() {
        goto(`/vaults/${vaultId}/expenses/new`);
    }

    // Check if we're on the statistics page to adjust button position
    let isStatisticsPage = $derived($page.url.pathname.includes('/statistics'));
</script>

<div class="relative">
    <div>
        {@render children?.()}
    </div>

    <!-- Floating Action Button -->
    <div class="fixed right-6 z-50 transition-all duration-200" class:bottom-[7rem]={isStatisticsPage} class:bottom-6={!isStatisticsPage}>
        <Button
            onclick={handleNewExpense}
            size="lg"
            class="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                viewBox="0 0 20 20"
                fill="currentColor"
            >
                <path
                    fill-rule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clip-rule="evenodd"
                />
            </svg>
            <span class="sr-only">Add New Expense</span>
        </Button>
    </div>
</div>
