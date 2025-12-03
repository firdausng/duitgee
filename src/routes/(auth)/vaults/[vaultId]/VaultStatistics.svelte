<script lang="ts">
    import { Card } from "$lib/components/ui/card";
    import type { VaultStatistics } from "./types";

    type Props = {
        statistics: VaultStatistics | null;
        isLoading: boolean;
        formatCurrency: (amount: number) => string;
    };

    let { statistics, isLoading, formatCurrency }: Props = $props();
</script>

{#if !isLoading && statistics}
    <!-- Total Summary -->
    <div class="mb-4 pb-3 border-b">
        <div class="flex items-baseline gap-3">
            <span class="text-xs text-muted-foreground">Total:</span>
            <span class="text-2xl font-bold">{formatCurrency(statistics.total.amount)}</span>
            <span class="text-xs text-muted-foreground">({statistics.total.count} expense{statistics.total.count !== 1 ? 's' : ''})</span>
        </div>
    </div>

    <!-- Expenses by Template -->
    {#if statistics.byTemplate.length > 0}
        <div class="mb-6">
            <h3 class="text-sm font-semibold mb-3">Expenses by Template</h3>
            <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {#each statistics.byTemplate as template}
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
                {/each}
            </div>
        </div>
    {/if}

    <!-- Expenses by Category -->
    {#if statistics.byCategory.length > 0}
        <div class="mb-6">
            <h3 class="text-sm font-semibold mb-3">Expenses by Category</h3>
            <div class="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {#each statistics.byCategory.slice(0, 8) as category}
                    <Card class="p-3">
                        <div class="space-y-1 text-center">
                            <div class="text-xs font-medium break-words">{category.categoryName}</div>
                            <div class="font-bold text-sm">{formatCurrency(category.totalAmount)}</div>
                            <p class="text-xs text-muted-foreground">{category.count} item{category.count !== 1 ? 's' : ''}</p>
                        </div>
                    </Card>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Expenses by Member -->
    {#if statistics.byMember.length > 0}
        <div class="mb-6">
            <h3 class="text-sm font-semibold mb-3">Expenses by Member</h3>
            <div class="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {#each statistics.byMember as member}
                    <Card class="p-3">
                        <div class="space-y-1 text-center">
                            <div class="text-xs font-medium break-words">{member.displayName}</div>
                            <div class="font-bold text-sm">{formatCurrency(member.totalAmount)}</div>
                            <p class="text-xs text-muted-foreground">{member.count} expense{member.count !== 1 ? 's' : ''}</p>
                        </div>
                    </Card>
                {/each}
            </div>
        </div>
    {/if}
{/if}
