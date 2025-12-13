<script lang="ts">
    import type {VaultWithMember} from "$lib/schemas/read/vaultWithMember";
    import { Button } from "$lib/components/ui/button";

    type Props = {
        vault: VaultWithMember;
        onSetDefaultVault: () => void;
        onToggleInviteForm: () => void;
        onCreateExpense: () => void;
        onEditVault: () => void;
    };

    let { vault, onSetDefaultVault, onToggleInviteForm, onCreateExpense, onEditVault }: Props = $props();
</script>

<div class="mb-4">
    <div class="flex flex-col justify-between gap-2 pb-2 rounded-lg shadow-lg">
        <div class="flex items-center gap-3">
            <div
                class="text-3xl w-14 h-14 rounded-lg flex items-center justify-center"
                style="background-color: {vault.vaults.color}20;"
            >
                {vault.vaults.icon || '🏦'}
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="text-2xl font-bold">{vault.vaults.name}</h1>
                    <button
                        class="p-1 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-md transition-colors {vault.vaultMembers.isDefault ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}"
                        onclick={onSetDefaultVault}
                        aria-label={vault.vaultMembers.isDefault ? 'Unset as default vault' : 'Set as default vault'}
                        title={vault.vaultMembers.isDefault ? 'Unset as default vault' : 'Set as default vault'}
                    >
                        {#if vault.vaultMembers.isDefault}
                            <!-- Filled star for default vault -->
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        {:else}
                            <!-- Outline star for non-default vault -->
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        {/if}
                    </button>
                </div>
                {#if vault.vaults.description}
                    <p class="text-sm text-muted-foreground">{vault.vaults.description}</p>
                {/if}
            </div>
        </div>
        <div class="flex gap-2">
            <Button variant="outline" onclick={onEditVault}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                <span class="hidden sm:inline">Edit Vault</span>
                <span class="sm:hidden">Edit</span>
            </Button>
            <Button variant="outline" onclick={onToggleInviteForm}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
                <span class="hidden sm:inline">Invite User</span>
                <span class="sm:hidden">Invite</span>
            </Button>
        </div>
    </div>
</div>
