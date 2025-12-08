import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform, params }) => {
	if (platform === undefined) {
		throw new Error('No platform');
	}

	if (!locals.currentUser) {
		throw error(401, 'Unauthorized');
	}

	const { vaultId } = params;

	return {
		vaultId
	};
};
