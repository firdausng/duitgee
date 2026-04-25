<script lang="ts" module>
    export type VaultSwitcherVault = {
        id: string;
        name: string;
        icon?: string | null;
        color?: string | null;
    };

    export type VaultSwitcherListProps = {
        vaults: VaultSwitcherVault[];
        currentVaultId: string | null;
        onSelect: (vaultId: string) => void;
        onAllVaults: () => void;
        onNewVault: () => void;
    };
</script>

<script lang="ts">
    import Wallet from '@lucide/svelte/icons/wallet';
    import Plus from '@lucide/svelte/icons/plus';
    import Check from '@lucide/svelte/icons/check';

    let {
        vaults,
        currentVaultId,
        onSelect,
        onAllVaults,
        onNewVault,
    }: VaultSwitcherListProps = $props();

    const VAULT_LIST_CAP = 8;
    const inlineVaults = $derived(vaults.slice(0, VAULT_LIST_CAP));
    const hasMore = $derived(vaults.length > VAULT_LIST_CAP);
</script>

<div class="py-1">
    <button
        type="button"
        onclick={onAllVaults}
        class="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left rounded-sm"
    >
        <Wallet class="size-4 text-muted-foreground shrink-0" />
        <span class="flex-1">All vaults</span>
    </button>
</div>

{#if vaults.length > 0}
    <div class="-mx-1 my-1 h-px bg-border"></div>
    <div class="py-1 max-h-[60vh] overflow-y-auto">
        {#each inlineVaults as v (v.id)}
            <button
                type="button"
                onclick={() => onSelect(v.id)}
                class="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left rounded-sm"
            >
                <span
                    class="inline-flex items-center justify-center size-6 rounded-md text-sm shrink-0 leading-none"
                    style="background-color: {v.color || '#3B82F6'}26;"
                    aria-hidden="true"
                >
                    {v.icon || '🏦'}
                </span>
                <span class="flex-1 min-w-0 truncate">{v.name}</span>
                {#if v.id === currentVaultId}
                    <Check class="size-4 text-primary shrink-0" />
                {/if}
            </button>
        {/each}
        {#if hasMore}
            <button
                type="button"
                onclick={onAllVaults}
                class="w-full flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-left rounded-sm"
            >
                <span class="size-6 shrink-0"></span>
                <span>See all {vaults.length} vaults…</span>
            </button>
        {/if}
    </div>
{/if}

<div class="-mx-1 my-1 h-px bg-border"></div>
<div class="py-1">
    <button
        type="button"
        onclick={onNewVault}
        class="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left rounded-sm"
    >
        <Plus class="size-4 text-muted-foreground shrink-0" />
        <span class="flex-1">New vault</span>
    </button>
</div>
