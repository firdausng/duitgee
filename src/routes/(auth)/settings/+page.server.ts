import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Default to Account when landing on /settings.
export const load: PageServerLoad = async () => {
    throw redirect(303, '/settings/account');
};
