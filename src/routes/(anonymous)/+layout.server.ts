import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({locals, url, params, platform, fetch}) => {
    if(platform === undefined){
        throw new Error("No platform")
    }

    return {
        basePath: platform.env.BASE_PATH,
        user: locals.currentUser,
        session: locals.currentSession,
    };
}