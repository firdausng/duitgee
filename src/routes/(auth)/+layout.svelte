<script lang="ts">
    import { authClientBase } from '$lib/client/auth-client-base';
    import { goto, invalidateAll } from '$app/navigation';
    import { page } from '$app/state';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { toast } from 'svelte-sonner';

    import {
        Sidebar,
        MobileAppBar,
        MobileBottomBar,
        type VaultSwitcherVault,
    } from '$lib/components/app-shell';
    import DesktopAppBar, { type DesktopAppBarVault } from '$lib/components/app-shell/DesktopAppBar.svelte';
    import { AddExpenseMenu, type AddExpenseMenuTemplate } from '$lib/components/ui/add-expense-menu';
    import type { ExpandableFabTemplate } from '$lib/components/ui/expandable-fab';

    import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

    let { children, data } = $props();

    let authClient = authClientBase({ basePath: data.basePath });

    // Vault context — driven by URL primarily, falls back to cookie for non-vault routes.
    const currentVaultId = $derived(data.currentVaultId);
    const fallbackVaultId = $derived(data.lastVaultId);

    // Vault used to render the chip — current if in a vault, otherwise last-visited.
    const chipVaultId = $derived(currentVaultId ?? fallbackVaultId);
    const chipVault = $derived<VaultSwitcherVault | null>(
        chipVaultId
            ? data.vaults
                  .map((v) => ({
                      id: v.vaults.id,
                      name: v.vaults.name,
                      icon: v.vaults.icon,
                      color: v.vaults.color,
                  }))
                  .find((v) => v.id === chipVaultId) ?? null
            : null,
    );

    // Richer projection for the desktop header — adds isDefault for the star toggle
    // and iconType so the IconRenderer can pick the right glyph.
    const appBarVault = $derived<DesktopAppBarVault | null>(
        chipVaultId
            ? data.vaults
                  .filter((v) => v.vaults.id === chipVaultId)
                  .map((v) => ({
                      id: v.vaults.id,
                      name: v.vaults.name,
                      icon: v.vaults.icon,
                      iconType: (v.vaults as { iconType?: string | null }).iconType ?? null,
                      isDefault: v.vaultMembers?.isDefault ?? false,
                  }))[0] ?? null
            : null,
    );

    async function handleSetDefaultVault() {
        if (!appBarVault) return;
        try {
            await ofetch('/api/setDefaultVault', {
                method: 'POST',
                body: { vaultId: appBarVault.id },
                headers: { 'Content-Type': 'application/json' },
            });
            // Refresh the layout's vaults data so the star reflects the new state.
            await invalidateAll();
        } catch (error) {
            console.error('Failed to set default vault:', error);
            toast.error('Could not set default vault');
        }
    }

    const vaultsForSwitcher = $derived<VaultSwitcherVault[]>(
        data.vaults.map((v) => ({
            id: v.vaults.id,
            name: v.vaults.name,
            icon: v.vaults.icon,
            color: v.vaults.color,
        })),
    );

    const currentPath = $derived(page.url.pathname);
    const searchParams = $derived(page.url.search || '');

    // Pending recurring approvals for the active vault — drives the Recurring badge.
    const pendingResource = resource(
        () => currentVaultId,
        async (id) => {
            if (!id) return 0;
            try {
                const res = await ofetch<{ success: boolean; data: unknown[] }>(
                    `/api/getPendingOccurrences?vaultId=${id}`,
                );
                return (res.data ?? []).length;
            } catch {
                return 0;
            }
        },
    );
    const pendingRecurring = $derived(pendingResource.current ?? 0);

    // Quick-add templates for the centered ⊕ on the mobile bottom bar.
    // Only loaded when in a vault context.
    const isCreateExpensePage = $derived(currentPath.includes('/expenses/new'));
    const returnToParam = $derived(encodeURIComponent(currentPath + searchParams));

    const templatesResource = resource(
        () => [chipVaultId, currentPath] as const,
        async ([id]) => {
            if (!id) return [] as ExpandableFabTemplate[];
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

    const quickAdd = $derived(
        chipVaultId && !isCreateExpensePage
            ? {
                  templates,
                  resolveTemplateHref: (templateId: string) =>
                      `/vaults/${chipVaultId}/expenses/new/form?templateId=${templateId}&returnTo=${returnToParam}`,
                  scratchHref: `/vaults/${chipVaultId}/expenses/new/form?returnTo=${returnToParam}`,
                  browseHref: `/vaults/${chipVaultId}/expenses/new?returnTo=${returnToParam}`,
              }
            : null,
    );

    async function signOut() {
        await authClient.signOut();
        await goto('/login');
    }

    let stoppingImpersonation = $state(false);
    async function stopImpersonating() {
        stoppingImpersonation = true;
        try {
            await authClient.admin.stopImpersonating();
            window.location.href = '/ops/users';
        } catch {
            stoppingImpersonation = false;
        }
    }
</script>

<div class="min-h-screen bg-background flex flex-col">
    {#if data.isImpersonating}
        <div class="sticky top-0 z-[60] w-full bg-amber-500/90 text-amber-950 text-sm">
            <div class="container mx-auto flex h-9 max-w-screen-2xl items-center justify-between gap-4 px-4">
                <div class="flex items-center gap-2 min-w-0">
                    <TriangleAlert class="size-4 shrink-0" />
                    <span class="truncate">
                        Impersonating <strong>{data.user?.name || data.user?.email}</strong>
                        {#if data.user?.email && data.user?.name}
                            <span class="opacity-75">({data.user.email})</span>
                        {/if}
                    </span>
                </div>
                <button
                    onclick={stopImpersonating}
                    disabled={stoppingImpersonation}
                    class="shrink-0 rounded-md bg-amber-950 text-amber-50 px-2.5 py-0.5 text-xs font-medium hover:bg-amber-900 disabled:opacity-50"
                >
                    {stoppingImpersonation ? 'Stopping...' : 'Stop'}
                </button>
            </div>
        </div>
    {/if}

    <div class="flex-1 flex min-h-0">
        <!-- Desktop sidebar -->
        <Sidebar
            vaults={vaultsForSwitcher}
            currentVaultId={currentVaultId}
            linkVaultId={chipVaultId}
            currentVault={chipVault}
            {currentPath}
            {searchParams}
            badges={{ pendingRecurring }}
            user={data.user}
            onLogout={signOut}
        />

        <!-- Main column -->
        <div class="flex-1 flex flex-col min-w-0">
            <MobileAppBar
                vaults={vaultsForSwitcher}
                currentVaultId={currentVaultId}
                currentVault={chipVault}
                {currentPath}
                {searchParams}
            />

            <DesktopAppBar vault={appBarVault} onSetDefault={handleSetDefaultVault}>
                {#snippet trailing()}
                    {#if quickAdd}
                        <AddExpenseMenu
                            templates={quickAdd.templates as AddExpenseMenuTemplate[]}
                            resolveTemplateHref={quickAdd.resolveTemplateHref}
                            scratchHref={quickAdd.scratchHref}
                            browseHref={quickAdd.browseHref}
                            anchor="bottom"
                        />
                    {/if}
                {/snippet}
            </DesktopAppBar>

            <main class="flex-1 overflow-x-hidden bg-background pb-20 md:pb-0">
                {@render children?.()}
            </main>
        </div>
    </div>

    <MobileBottomBar
        currentVaultId={currentVaultId}
        linkVaultId={chipVaultId}
        {currentPath}
        {searchParams}
        badges={{ pendingRecurring }}
        {quickAdd}
    />
</div>
