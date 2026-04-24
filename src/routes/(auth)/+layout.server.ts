import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({locals, url, params, platform, fetch}) => {
    if(platform === undefined){
        throw new Error("No platform")
    }

    // Fetch user's vaults for the navigation drawer
    let vaults = [];
    try {
        const response = await fetch('/api/getVaults');
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                vaults = result.data || [];
            }
        }
    } catch (error) {
        console.error('Failed to fetch vaults for navigation:', error);
    }

    return {
        basePath: platform.env.BASE_PATH,
        vaults,
        user: locals.currentUser,
        isImpersonating: !!locals.currentSession?.session?.impersonatedBy,
    };
}