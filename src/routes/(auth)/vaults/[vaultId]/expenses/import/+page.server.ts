import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { checkVaultEntitlement } from '$lib/server/utils/entitlements';

export const load: PageServerLoad = async ({ locals, platform, params }) => {
    if (platform === undefined) {
        throw new Error('No platform');
    }

    if (!locals.currentUser) {
        throw error(401, 'Unauthorized');
    }

    const { vaultId } = params;
    const session = locals.currentSession;
    const env = platform.env;

    const vaultResult = await getVault(session, vaultId, env).catch((err) => {
        console.error('Failed to load vault for import:', err);
        return null;
    });

    if (!vaultResult?.vaults) {
        throw error(404, 'Vault not found');
    }

    // Surface the entitlement state to the page so it can show an upsell instead
    // of letting the user upload then bounce off a 403.
    const canImport = await checkVaultEntitlement(vaultId, 'expense:import', env);

    return {
        vaultId,
        vault: vaultResult.vaults,
        canImport,
    };
};
