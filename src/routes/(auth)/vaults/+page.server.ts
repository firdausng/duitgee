import {error} from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, platform, url, cookies }) => {
    if(platform === undefined){
        throw new Error("No platform")
    }

    console.log({
        message: "[vaults] loading vaults",
        locals,
        session: locals.currentSession,
        user: locals.currentUser
    });

    try {
        return {
            activeUser: locals.currentUser,
            activeSession: locals.currentSession,
        };
    } catch (err) {
        throw error(500, 'Failed to load category');
    }
};