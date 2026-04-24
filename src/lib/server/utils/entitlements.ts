import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { vaults } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { type Entitlement, hasEntitlement } from '$lib/configurations/plans';

/**
 * Check if a vault's plan includes the given entitlement.
 */
export const checkVaultEntitlement = async (
    vaultId: string,
    entitlement: Entitlement,
    env: Cloudflare.Env
): Promise<boolean> => {
    const client = drizzle(env.DB, { schema });

    const result = await client
        .select({ planId: vaults.planId })
        .from(vaults)
        .where(and(eq(vaults.id, vaultId), isNull(vaults.deletedAt)))
        .limit(1);

    if (result.length === 0) return false;

    return hasEntitlement(result[0].planId, entitlement);
};

/**
 * Enforce that a vault's plan includes the given entitlement.
 * Throws an error if the entitlement is not present.
 */
export const requireVaultEntitlement = async (
    session: App.AuthSession,
    vaultId: string,
    entitlement: Entitlement,
    env: Cloudflare.Env
): Promise<void> => {
    const allowed = await checkVaultEntitlement(vaultId, entitlement, env);

    if (!allowed) {
        throw new Error(`Entitlement denied: '${entitlement}' is not available on this vault's plan`);
    }
};
