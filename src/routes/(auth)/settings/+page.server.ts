import type { PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateProfileSchema } from '$lib/schemas/settings';

export const load: PageServerLoad = async ({ locals }) => {
	const form = await superValidate(
		{ name: locals.currentUser?.name || '' },
		valibot(updateProfileSchema)
	);

	return {
		form,
		user: locals.currentUser
	};
};
