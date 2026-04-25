import type { LayoutServerLoad } from './$types';
import { getVaults } from '$lib/server/api/vaults/getVaultsHandler';

const LAST_VAULT_COOKIE = 'lastVaultId';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export const load: LayoutServerLoad = async ({ locals, url, platform, cookies }) => {
    if (platform === undefined) {
        throw new Error('No platform');
    }

    // Fetch user's vaults for the navigation chrome. Direct handler call —
    // this layout runs on every authenticated page so a self-fetch here
    // would re-pay the auth middleware + JSON round-trip on every navigation.
    let vaults: Array<{ vaults: { id: string; name: string; icon: string | null; color: string | null } }> = [];
    if (locals.currentSession) {
        try {
            // Handler returns { vaults: [...] }; the API endpoint unwraps to data.vaults,
            // and we mirror that unwrap here.
            const result = await getVaults(locals.currentSession, platform.env);
            vaults = (result.vaults ?? []) as typeof vaults;
        } catch (error) {
            console.error('Failed to fetch vaults for navigation:', error);
        }
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
