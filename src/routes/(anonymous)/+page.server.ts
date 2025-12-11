import type { PageServerLoad } from "./$types";
import {redirect} from "@sveltejs/kit";
import type {VaultWithMember} from "$lib/schemas/read/vaultWithMember";

export const load: PageServerLoad = async ({ locals, platform, url, cookies, fetch }) => {
    if(platform === undefined){
        throw new Error("No platform")
    }

    if(locals.currentUser){
        const response = await fetch(`/api/getVaults`);
        if (response.ok) {
            const result = await response.json() as {success: boolean, data: VaultWithMember[]};
            const defaultVault = result.data.find(vault => vault.vaultMembers.isDefault);
            if(defaultVault){
                redirect(302, `/vaults/${defaultVault.vaults.id}`);
            }
        }
    }

    return {
        activeUser: locals.currentUser,
        pathname: url.pathname,
    };
};