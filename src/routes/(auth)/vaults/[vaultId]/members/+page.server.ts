import {error} from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";
import {getVault} from "$lib/server/api/vaults/getVaultHandler";
import {getUserVaultRole, getVaultPermissions} from "$lib/server/utils/vaultPermissions";

export const load: PageServerLoad = async ({ locals, platform, url, params }) => {
	if(platform === undefined){
		throw new Error("No platform")
	}

	if (!locals.currentUser) {
		throw error(401, 'Unauthorized');
	}

	const { vaultId } = params;
	const session = locals.currentSession;

	try {
		// Get vault with all members
		const vaultData = await getVault(session, vaultId, platform.env);

		if (!vaultData) {
			throw error(404, 'Vault not found');
		}

		// Get current user's role and permissions
		const userRole = await getUserVaultRole(session.user.id, vaultId, platform.env);
		const permissions = getVaultPermissions(userRole);

		return {
			vaultId,
			url: url.pathname,
			vault: vaultData.vaults,
			members: vaultData.members,
			currentMembership: vaultData.vaultMembers,
			userRole,
			permissions
		};
	} catch (err) {
		console.error('Error loading vault members:', err);
		throw error(500, 'Failed to load vault members');
	}
};