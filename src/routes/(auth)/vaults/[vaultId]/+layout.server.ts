import type { LayoutServerLoad } from './$types';
import {authConfig} from "$lib/server/better-auth";

export const load: LayoutServerLoad = async ({locals, url, params, platform}) => {
    if(platform === undefined){
        throw new Error("No platform")
    }

    let {vaultId} = params;

    return {
        activeUser: locals.currentUser,
        pathname: url.pathname,
        vaultId,
    };
}