import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { getVaultPendingInvitations } from '$lib/server/api/invitations/getVaultPendingInvitationsHandler';
import { getUserVaultRole, getVaultPermissions } from '$lib/server/utils/vaultPermissions';

export const load: PageServerLoad = async ({ locals, platform, url, params }) => {
	if (platform === undefined) throw new Error('No platform');
	if (!locals.currentUser) throw error(401, 'Unauthorized');

	const { vaultId } = params;
	const session = locals.currentSession;
	const env = platform.env;

	try {
		// Run all reads in parallel — vault data, role, and pending invitations
		// are independent. Direct handler calls keep us off the self-fetch path.
		const [vaultData, userRole, pendingInvitations] = await Promise.all([
			getVault(session, vaultId, env),
			getUserVaultRole(session.user.id, vaultId, env),
			getVaultPendingInvitations(session, vaultId, env).catch((err) => {
				console.error('Failed to load pending invitations:', err);
				return [];
			}),
		]);

		if (!vaultData) throw error(404, 'Vault not found');

		const permissions = getVaultPermissions(userRole);

		return {
			vaultId,
			url: url.pathname,
			vault: vaultData.vaults,
			members: vaultData.members,
			currentMembership: vaultData.vaultMembers,
			userRole,
			permissions,
			pendingInvitations,
		};
	} catch (err) {
		// Re-throw SvelteKit redirects/errors as-is
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Error loading vault members:', err);
		throw error(500, 'Failed to load vault members');
	}
};
