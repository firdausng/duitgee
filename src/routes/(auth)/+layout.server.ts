import type { LayoutServerLoad } from './$types';

const LAST_VAULT_COOKIE = 'lastVaultId';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export const load: LayoutServerLoad = async ({ locals, url, platform, fetch, cookies }) => {
    if (platform === undefined) {
        throw new Error('No platform');
    }

    // Fetch user's vaults for the navigation chrome.
    let vaults: Array<{ vaults: { id: string; name: string; icon: string | null; color: string | null } }> = [];
    try {
        const response = await fetch('/api/getVaults');
        if (response.ok) {
            const result = await response.json() as { success: boolean; data?: typeof vaults };
            if (result.success) {
                vaults = result.data || [];
            }
        }
    } catch (error) {
        console.error('Failed to fetch vaults for navigation:', error);
    }

    // Determine the active vault from the URL, falling back to the last-visited
    // (cookie) so non-vault routes (/settings, /invitations) still show context.
    const vaultPathMatch = url.pathname.match(/^\/vaults\/([^/]+)/);
    const urlVaultId = vaultPathMatch && vaultPathMatch[1] !== 'new' ? vaultPathMatch[1] : null;

    if (urlVaultId) {
        cookies.set(LAST_VAULT_COOKIE, urlVaultId, {
            path: '/',
            maxAge: COOKIE_MAX_AGE,
            sameSite: 'lax',
            httpOnly: false,
        });
    }

    const cookieVaultId = cookies.get(LAST_VAULT_COOKIE);
    const fallbackVaultId =
        urlVaultId ??
        (cookieVaultId && vaults.some((v) => v.vaults.id === cookieVaultId) ? cookieVaultId : null) ??
        vaults[0]?.vaults.id ??
        null;

    return {
        basePath: platform.env.BASE_PATH,
        vaults,
        currentVaultId: urlVaultId,
        lastVaultId: fallbackVaultId,
        user: locals.currentUser,
        isImpersonating: !!locals.currentSession?.session?.impersonatedBy,
    };
};
