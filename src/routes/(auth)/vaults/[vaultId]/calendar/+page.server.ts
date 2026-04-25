import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (platform === undefined) throw new Error('No platform');
	if (!locals.currentUser) throw error(401, 'Unauthorized');

	const { vaultId } = params;

	let vault = null;
	try {
		const result = await getVault(locals.currentSession, vaultId, platform.env);
		vault = result?.vaults ?? null;
	} catch (err) {
		console.error('Failed to load vault:', err);
	}

	return {
		vaultId,
		vault,
	};
};
