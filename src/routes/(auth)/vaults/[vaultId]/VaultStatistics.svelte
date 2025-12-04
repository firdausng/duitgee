<script lang="ts">
    import { Card } from "$lib/components/ui/card";
    import type { VaultStatistics } from "./types";
    import { scale } from "svelte/transition";

    type Props = {
        statistics: VaultStatistics;
        isLoading: boolean;
        formatCurrency: (amount: number) => string;
    };


    let { statistics=$bindable({
        total: {amount: 0, count: 0},
        byTemplate: [],
        byCategory: [],
        byMember: []
    }), isLoading, formatCurrency }: Props = $props();

    let showFilterByTemplate = $derived(statistics.byTemplate.length > 0);
    let showFilterByCategory = $derived(statistics.byCategory.length > 0);
    let showFilterByMember = $derived(statistics.byMember.length > 0);
</script>


{#if statistics}
    <div in:scale={{ start: 0.95, duration: 400 }}>
        <!-- Total Summary -->
        <div class="mb-4 pb-3 border-b">
            <div class="flex items-baseline gap-3">
                <span class="text-xs text-muted-foreground">Total:</span>
                <span class="text-2xl font-bold">{formatCurrency(statistics.total.amount)}</span>
                <span class="text-xs text-muted-foreground">({statistics.total.count} expense{statistics.total.count !== 1 ? 's' : ''})</span>
            </div>
        </div>

        <!-- Expenses by Template -->
        <div class:[mb-6]={showFilterByTemplate} class="pb-2">
            {#if showFilterByTemplate}
                <h3 class="text-sm font-semibold mb-3">Expenses by Template</h3>
            {/if}
            <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 justify-items-center">
                {#each statistics.byTemplate as template (template.templateId)}
                    <div in:scale|local={{ start: 0.95, duration: 400 }} class="w-full max-w-[200px]">
                        <Card class="p-3">
                            <div class="space-y-2">
                                <div class="flex flex-col items-center text-center gap-1">
                                    <div class="text-2xl">{template.templateIcon}</div>
                                    <div class="text-xs font-medium break-words w-full">{template.templateName}</div>
                                </div>
                                <div class="space-y-0.5 text-center">
                                    <div class="font-bold text-sm">{formatCurrency(template.totalAmount)}</div>
                                    <p class="text-xs text-muted-foreground">{template.count} expense{template.count !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Expenses by Category -->
        <div class:[mb-6]={showFilterByCategory}  class="pb-2">
            {#if showFilterByCategory}
                <h3 class="text-sm font-semibold mb-3">Expenses by Category</h3>
            {/if}
            <div class="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 justify-items-center">
                {#each statistics.byCategory.slice(0, 8) as category}
                    <div class="w-full max-w-[200px]">
                        <Card class="p-3">
                            <div class="space-y-1 text-center">
                                <div class="text-xs font-medium break-words">{category.categoryName}</div>
                                <div class="font-bold text-sm">{formatCurrency(category.totalAmount)}</div>
                                <p class="text-xs text-muted-foreground">{category.count} item{category.count !== 1 ? 's' : ''}</p>
                            </div>
                        </Card>
                    </div>
                {/each}
            </div>
        </div>

        <!-- gride item itself  -->
        <div class:[mb-6]={showFilterByMember}  class="pb-2">
            {#if showFilterByMember}
                <h3 class="text-sm font-semibold mb-3">Expenses by Member</h3>
            {/if}
            <div class="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 justify-items-center">
                {#each statistics.byMember as member}
                    <div class="w-full max-w-[200px]">
                        <Card class="p-3">
                            <div class="space-y-1 text-center">
                                <div class="text-xs font-medium break-words">{member.displayName}</div>
                                <div class="font-bold text-sm">{formatCurrency(member.totalAmount)}</div>
                                <p class="text-xs text-muted-foreground">{member.count} expense{member.count !== 1 ? 's' : ''}</p>
                            </div>
                        </Card>
                    </div>
                {/each}
            </div>
        </div>

    </div>
{/if}
