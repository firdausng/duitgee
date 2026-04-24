import { error } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/utils/adminCheck';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
    if (platform === undefined) {
        throw new Error('No platform');
    }
    if (!locals.currentUser || !isAdmin(locals.currentUser)) {
        throw error(404, 'Not found');
    }
    return {
        adminUser: locals.currentUser,
        basePath: platform.env.BASE_PATH,
    };
};
