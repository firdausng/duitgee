import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPendingInvitations } from '$lib/server/api/invitations/getPendingInvitationsHandler';
import { getSentInvitations } from '$lib/server/api/invitations/getSentInvitationsHandler';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (platform === undefined) throw new Error('No platform');
	if (!locals.currentSession) throw error(401, 'Unauthorized');

	const session = locals.currentSession;
	const env = platform.env;

	const [received, sent] = await Promise.all([
		getPendingInvitations(session, env).catch((err) => {
			console.error('Failed to load pending invitations:', err);
			return [];
		}),
		getSentInvitations(session, env).catch((err) => {
			console.error('Failed to load sent invitations:', err);
			return [];
		}),
	]);

	return {
		receivedInvitations: received,
		sentInvitations: sent,
	};
};
