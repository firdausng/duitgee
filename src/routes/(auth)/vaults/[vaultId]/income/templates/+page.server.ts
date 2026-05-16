import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { getFunds } from '$lib/server/api/funds/getFundsHandler';

export const ssr = false;

export const load: PageServerLoad = async ({ params, locals, platform }) => {
    if (platform === undefined) throw new Error('No platform');
    if (!locals.currentUser) throw error(401, 'Unauthorized');

    const vaultId = params.vaultId;
    const session = locals.currentSession;
    const env = platform.env;

    const [vaultResult, fundRows] = await Promise.all([
        getVault(session, vaultId, env).catch(() => null),
        getFunds(vaultId, session, env).catch(() => []),
    ]);

    const members: Array<{ userId: string; displayName: string }> = (vaultResult?.members ?? []).map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
    }));

    const funds: Array<{ id: string; name: string; icon: string | null }> = (fundRows ?? [])
        .map((row: any) => ({
            id: row.fund.id,
            name: row.fund.name,
            icon: row.fund.icon ?? null,
            status: row.fund.status,
        }))
        .filter((f) => f.status === 'active')
        .map(({ status, ...rest }) => rest);

    return { vaultId, members, funds };
};
