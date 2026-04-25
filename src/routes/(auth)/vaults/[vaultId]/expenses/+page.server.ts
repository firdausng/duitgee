import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { getFunds } from '$lib/server/api/funds/getFundsHandler';
import { getTags } from '$lib/server/api/tags/getTagsHandler';

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

	// Run all three reads in parallel — they're independent and each one is a
	// direct handler call (no self-fetch overhead, no auth re-validation, no
	// JSON serialize/parse round-trip).
	const [vaultResult, fundRows, tagRows] = await Promise.all([
		getVault(session, vaultId, env).catch((err) => {
			console.error('Failed to load vault:', err);
			return null;
		}),
		getFunds(vaultId, session, env).catch((err) => {
			console.error('Failed to load funds:', err);
			return [];
		}),
		getTags(session, vaultId, env).catch((err) => {
			console.error('Failed to load tags:', err);
			return [];
		}),
	]);

	const vault = vaultResult?.vaults ?? null;
	const members: Array<{ userId: string; displayName: string }> = (vaultResult?.members ?? []).map((m) => ({
		userId: m.userId,
		displayName: m.displayName,
	}));

	const funds: Array<{ id: string; name: string; icon: string | null }> = (fundRows ?? [])
		.filter((row: any) => row.fund?.status !== 'archived')
		.map((row: any) => ({
			id: row.fund.id,
			name: row.fund.name,
			icon: row.fund.icon ?? null,
		}));

	const tags: Array<{ id: string; name: string; color: string | null }> = (tagRows ?? []).map((t) => ({
		id: t.id,
		name: t.name,
		color: t.color ?? null,
	}));

	return {
		vaultId,
		vault,
		members,
		funds,
		tags,
	};
};
