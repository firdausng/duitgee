import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform, params, fetch }) => {
	if (platform === undefined) {
		throw new Error('No platform');
	}

	if (!locals.currentUser) {
		throw error(401, 'Unauthorized');
	}

	const { vaultId } = params;

	// Vault (for locale/currency) + members list (for the Paid-by filter options).
	let vault = null;
	let members: Array<{ userId: string; displayName: string }> = [];
	try {
		const response = await fetch(`/api/getVault?vaultId=${vaultId}`);
		if (response.ok) {
			const result = (await response.json()) as { success: boolean; data: any };
			if (result.success && result.data) {
				vault = result.data.vaults;
				members = (result.data.members ?? []).map((m: any) => ({
					userId: m.userId,
					displayName: m.displayName,
				}));
			}
		}
	} catch (err) {
		console.error('Failed to fetch vault:', err);
	}

	// Vault funds (for the Fund filter options). Empty on failure — the popover
	// renders an "no funds" empty state in that case.
	let funds: Array<{ id: string; name: string; icon: string | null }> = [];
	try {
		const response = await fetch(`/api/getFunds?vaultId=${vaultId}`);
		if (response.ok) {
			const result = (await response.json()) as { success: boolean; data: any[] };
			if (result.success && Array.isArray(result.data)) {
				funds = result.data
					.filter((row: any) => row.fund?.status !== 'archived')
					.map((row: any) => ({
						id: row.fund.id,
						name: row.fund.name,
						icon: row.fund.icon ?? null,
					}));
			}
		}
	} catch (err) {
		console.error('Failed to fetch funds:', err);
	}

	return {
		vaultId,
		vault,
		members,
		funds,
	};
};
