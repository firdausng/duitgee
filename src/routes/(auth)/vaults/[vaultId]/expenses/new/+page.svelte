<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { Button } from '$lib/components/ui/button';
    import { Card } from '$lib/components/ui/card';
    import { page } from '$app/state';
    import FilePlus from '@lucide/svelte/icons/file-plus';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Plus from '@lucide/svelte/icons/plus';
    import HelpCircle from '@lucide/svelte/icons/circle-help';
    import Loader2 from '@lucide/svelte/icons/loader-2';
    import { createVaultFormatters } from '$lib/vaultFormatting';
    import { QuickLogModal } from '$lib/components/unidentified';

    const vaultId = page.params.vaultId as string;

    // Forward the caller's returnTo (if any) through to the form.
    const returnToParam = $derived(page.url.searchParams.get('returnTo'));

    function formUrl(templateId?: string): string {
        const params = new URLSearchParams();
        if (templateId) params.set('templateId', templateId);
        if (returnToParam) params.set('returnTo', returnToParam);
        const qs = params.toString();
        return `/vaults/${vaultId}/expenses/new/form${qs ? `?${qs}` : ''}`;
    }

    let templates = $state<Client.ExpenseTemplate[]>([]);
    let isLoading = $state(true);
    let vault = $state<{ locale?: string; currency?: string } | null>(null);
    let quickLogOpen = $state(false);
    const currentUserId = $derived(page.data.currentSession?.user?.id ?? '');

    const fmt = $derived(
        createVaultFormatters({
            locale: vault?.locale || 'en-US',
            currency: vault?.currency || 'USD',
        }),
    );

    onMount(async () => {
        try {
            const [tplRes, vaultRes] = await Promise.all([
                ofetch<Client.AppResponse<Client.ExpenseTemplateData>>(
                    `/api/getExpenseTemplates?vaultId=${vaultId}`,
                ),
                ofetch<Client.AppResponse<{ vaults: { locale?: string; currency?: string } }>>(
                    `/api/getVault?vaultId=${vaultId}`,
                ).catch(() => null),
            ]);
            templates = tplRes.data.templates || [];
            vault = vaultRes?.data?.vaults ?? null;
        } catch (error) {
            console.error('Failed to fetch templates:', error);
            templates = [];
        } finally {
            isLoading = false;
        }

        // If no templates exist, picker has nothing to offer — skip straight to the form.
        if (!isLoading && templates.length === 0) {
            goto(formUrl(), { replaceState: true });
        }
    });

    function handleUseTemplate(templateId: string) {
        goto(formUrl(templateId));
    }

    function handleSkip() {
        goto(formUrl());
    }

    function handleCreateTemplate() {
        goto(`/vaults/${vaultId}/templates/new`);
    }

    function handleEditTemplate(templateId: string) {
        goto(`/vaults/${vaultId}/templates/${templateId}/edit`);
    }
</script>

<svelte:head>
    <title>New Expense - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-4 px-4">
    {#if isLoading}
        <div class="flex justify-center py-16">
            <Loader2 class="size-8 animate-spin text-muted-foreground" />
        </div>
    {:else}
        <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
                <h1 class="text-xl font-semibold">Pick a template</h1>
                <p class="text-xs text-muted-foreground">
                    Or <button type="button" onclick={handleSkip} class="text-primary hover:underline">start from scratch</button> to enter manually.
                </p>
            </div>
            <Button variant="outline" onclick={handleCreateTemplate} size="sm">
                <Plus class="size-4" />
                New Template
            </Button>
        </div>

        <!-- Compact grid: scratch card first, then templates. 3 cols mobile
             → 7 xl. Single-line names, usage count only, drop default amount. -->
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
            <!-- Start from scratch card -->
            <button
                type="button"
                onclick={handleSkip}
                class="group relative rounded-[var(--radius-md)] border border-dashed border-border bg-card p-2 hover:border-primary/60 hover:bg-muted/40 transition-colors text-center"
            >
                <div class="flex flex-col items-center gap-1">
                    <div class="flex items-center justify-center size-9 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                        <FilePlus class="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div class="text-xs font-medium truncate w-full">Start from scratch</div>
                    <p class="text-[10px] text-muted-foreground">Blank form</p>
                </div>
            </button>

            <!-- Quick log unidentified card -->
            <button
                type="button"
                onclick={() => (quickLogOpen = true)}
                class="group relative rounded-[var(--radius-md)] border border-dashed border-border bg-card p-2 hover:border-amber-300 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors text-center"
            >
                <div class="flex flex-col items-center gap-1">
                    <div class="flex items-center justify-center size-9 rounded-full bg-amber-100 dark:bg-amber-950/40 group-hover:bg-amber-200/70 dark:group-hover:bg-amber-900/40 transition-colors">
                        <HelpCircle class="size-4 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div class="text-xs font-medium truncate w-full">Quick log</div>
                    <p class="text-[10px] text-muted-foreground">Just amount</p>
                </div>
            </button>

            {#each templates as template (template.id)}
                <button
                    type="button"
                    onclick={() => handleUseTemplate(template.id)}
                    class="group relative rounded-[var(--radius-md)] border border-border bg-card p-2 hover:border-primary/60 hover:shadow-sm transition-all text-center"
                    title={template.name}
                >
                    <!-- Edit button (hover on desktop) -->
                    <span
                        role="button"
                        tabindex="0"
                        onclick={(e) => {
                            e.stopPropagation();
                            handleEditTemplate(template.id);
                        }}
                        onkeydown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                handleEditTemplate(template.id);
                            }
                        }}
                        class="absolute top-0.5 right-0.5 inline-flex items-center justify-center size-5 rounded-[var(--radius-sm)] text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        aria-label="Edit template"
                        title="Edit template"
                    >
                        <Pencil class="size-3" />
                    </span>

                    <div class="flex flex-col items-center gap-0.5">
                        <div class="text-2xl leading-none select-none" aria-hidden="true">
                            {template.icon || '📝'}
                        </div>
                        <div class="text-xs font-medium truncate w-full">
                            {template.name}
                        </div>
                        {#if template.usageCount > 0}
                            <p class="text-[10px] text-subtle-foreground">
                                {template.usageCount}
                            </p>
                        {/if}
                    </div>
                </button>
            {/each}
        </div>
    {/if}
</div>

{#if currentUserId}
    <QuickLogModal
        {vaultId}
        {currentUserId}
        bind:open={quickLogOpen}
        onCreated={() => goto(returnToParam ?? `/vaults/${vaultId}/expenses`)}
    />
{/if}

<style>
    @media (hover: none) {
        :global(.group [aria-label="Edit template"]) {
            opacity: 1;
        }
    }
</style>
