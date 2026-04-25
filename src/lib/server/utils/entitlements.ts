import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { vaults } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { type Entitlement, FREE_PLAN_ID, hasEntitlement } from '$lib/configurations/plans';
import { getAttachmentLimitPerExpense } from '$lib/schemas/attachments';

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

/**
 * Enforce that a single expense's attachment count fits the vault's plan limit.
 * Throws a user-facing error message when over.
 */
export const requireAttachmentCount = async (
    vaultId: string,
    count: number,
    env: Cloudflare.Env,
): Promise<void> => {
    if (count <= 0) return;

    const client = drizzle(env.DB, { schema });
    const result = await client
        .select({ planId: vaults.planId })
        .from(vaults)
        .where(and(eq(vaults.id, vaultId), isNull(vaults.deletedAt)))
        .limit(1);

    const planId = result[0]?.planId ?? FREE_PLAN_ID;
    const limit = getAttachmentLimitPerExpense(planId);
    if (count > limit) {
        throw new Error(
            `Attachment limit exceeded: ${count} attachments, max ${limit} on this vault's plan.`,
        );
    }
};
