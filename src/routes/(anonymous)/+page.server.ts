import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, platform, url, cookies }) => {
    if(platform === undefined){
        throw new Error("No platform")
    }

    return {
        activeUser: locals.currentUser,
        pathname: url.pathname,
    };
};