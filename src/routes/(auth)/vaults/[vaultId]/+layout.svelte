<script lang="ts">
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { ExpandableFab, type ExpandableFabTemplate } from '$lib/components/ui/expandable-fab';

    let { children } = $props();

    let { vaultId } = page.params;

    let isCreateExpensePage = $derived(page.url.pathname.includes('/expenses/new'));

    // Current page URL for returnTo propagation.
    const returnToParam = $derived(encodeURIComponent(page.url.pathname + page.url.search));

    // Fetch top-used templates for the FAB shortcuts. Refetches on navigation so
    // usage counts stay fresh after a save (which invalidates pages and bumps counts).
    const templatesResource = resource(
        () => [vaultId, page.url.pathname] as const,
        async ([id]) => {
            try {
                const response = await ofetch<{
                    success: boolean;
                    data: { templates: ExpandableFabTemplate[] };
                }>(`/api/getExpenseTemplates?vaultId=${id}`);
                return response.data?.templates ?? [];
            } catch {
                return [] as ExpandableFabTemplate[];
            }
        },
    );
    const templates = $derived(templatesResource.current ?? []);

    // URL builders — all propagate returnTo so the form lands the user back
    // on the page they started from.
    const resolveTemplateHref = $derived(
        (templateId: string) =>
            `/vaults/${vaultId}/expenses/new/form?templateId=${templateId}&returnTo=${returnToParam}`,
    );
    const scratchHref = $derived(
        `/vaults/${vaultId}/expenses/new/form?returnTo=${returnToParam}`,
    );
    const browseHref = $derived(
        `/vaults/${vaultId}/expenses/new?returnTo=${returnToParam}`,
    );
</script>

<div>
    {@render children?.()}
</div>

{#if !isCreateExpensePage}
    <ExpandableFab
        {templates}
        {resolveTemplateHref}
        {scratchHref}
        {browseHref}
    />
{/if}
