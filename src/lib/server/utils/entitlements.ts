import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import * as authSchema from '$lib/server/db/better-auth-schema';
import { vaults, vaultMembers, vaultPlanCoverage } from '$lib/server/db/schema';
import { user as authUser } from '$lib/server/db/better-auth-schema';
import { and, eq, inArray, isNull, asc } from 'drizzle-orm';
import {
    type Entitlement,
    FREE_PLAN_ID,
    PRO_PLAN_ID,
    type PlanLimits,
    getPlanById,
    getPlanLimit,
    hasEntitlement,
} from '$lib/configurations/plans';

/**
 * Resolve a vault's effective plan from its owner/admin members.
 *
 * Rule: vault is Pro if any active owner/admin has plan_pro AND that user is
 * either under their plan's `maxCoveredVaults` cap OR has explicitly added the
 * vault to their `vaultPlanCoverage` rows. Plain members don't contribute.
 */
export const getVaultEffectivePlan = async (
    vaultId: string,
    env: Cloudflare.Env,
): Promise<string> => {
    const client = drizzle(env.DB, { schema });

    const vaultRow = await client
        .select({ id: vaults.id })
        .from(vaults)
        .where(and(eq(vaults.id, vaultId), isNull(vaults.deletedAt)))
        .limit(1);
    if (vaultRow.length === 0) return FREE_PLAN_ID;

    // Active owner/admin members of this vault — they are the only contributors.
    const adminMembers = await client
        .select({ userId: vaultMembers.userId })
        .from(vaultMembers)
        .where(
            and(
                eq(vaultMembers.vaultId, vaultId),
                eq(vaultMembers.status, 'active'),
                inArray(vaultMembers.role, ['owner', 'admin']),
            ),
        );
    if (adminMembers.length === 0) return FREE_PLAN_ID;

    const adminUserIds = adminMembers.map((m) => m.userId);

    // Their plans (auth DB).
    const authClient = drizzle(env.AUTH_DB, { schema: authSchema });
    const userPlans = await authClient
        .select({ id: authUser.id, planId: authUser.planId })
        .from(authUser)
        .where(inArray(authUser.id, adminUserIds));

    const proAdminIds = userPlans
        .filter((u) => u.planId === PRO_PLAN_ID)
        .map((u) => u.id);
    if (proAdminIds.length === 0) return FREE_PLAN_ID;

    // For each Pro admin, check if this vault is in their coverage scope.
    for (const userId of proAdminIds) {
        if (await isVaultCoveredByUser(userId, vaultId, env)) {
            return PRO_PLAN_ID;
        }
    }

    return FREE_PLAN_ID;
};

/**
 * Whether `vaultId` falls within `userId`'s Pro coverage. Either:
 *   - explicit row in `vaultPlanCoverage`, OR
 *   - user is under their plan's `maxCoveredVaults` cap and this vault is
 *     among the first N (by createdAt asc) vaults where they're owner/admin.
 *
 * Assumes caller has already verified user is plan_pro.
 */
const isVaultCoveredByUser = async (
    userId: string,
    vaultId: string,
    env: Cloudflare.Env,
): Promise<boolean> => {
    const client = drizzle(env.DB, { schema });

    // Explicit coverage pick wins.
    const explicit = await client
        .select({ vaultId: vaultPlanCoverage.vaultId })
        .from(vaultPlanCoverage)
        .where(
            and(
                eq(vaultPlanCoverage.userId, userId),
                eq(vaultPlanCoverage.vaultId, vaultId),
            ),
        )
        .limit(1);
    if (explicit.length > 0) return true;

    // If user has any explicit picks at all, treat coverage as opt-in only.
    const anyExplicit = await client
        .select({ vaultId: vaultPlanCoverage.vaultId })
        .from(vaultPlanCoverage)
        .where(eq(vaultPlanCoverage.userId, userId))
        .limit(1);
    if (anyExplicit.length > 0) return false;

    // No explicit picks — use deterministic order (createdAt asc) up to cap.
    const cap = getPlanLimit(PRO_PLAN_ID, 'maxCoveredVaults');
    if (cap === -1) return true;

    const ownedOrAdminVaults = await client
        .select({ vaultId: vaults.id })
        .from(vaults)
        .innerJoin(vaultMembers, eq(vaultMembers.vaultId, vaults.id))
        .where(
            and(
                eq(vaultMembers.userId, userId),
                eq(vaultMembers.status, 'active'),
                inArray(vaultMembers.role, ['owner', 'admin']),
                isNull(vaults.deletedAt),
            ),
        )
        .orderBy(asc(vaults.createdAt))
        .limit(cap);

    return ownedOrAdminVaults.some((v) => v.vaultId === vaultId);
};

/**
 * Check if a vault's effective plan includes the given entitlement.
 */
export const checkVaultEntitlement = async (
    vaultId: string,
    entitlement: Entitlement,
    env: Cloudflare.Env,
): Promise<boolean> => {
    const planId = await getVaultEffectivePlan(vaultId, env);
    return hasEntitlement(planId, entitlement);
};

/**
 * Enforce that a vault's effective plan includes the given entitlement.
 * Throws if denied.
 */
export const requireVaultEntitlement = async (
    session: App.AuthSession,
    vaultId: string,
    entitlement: Entitlement,
    env: Cloudflare.Env,
): Promise<void> => {
    const allowed = await checkVaultEntitlement(vaultId, entitlement, env);
    if (!allowed) {
        throw new Error(
            `Entitlement denied: '${entitlement}' is not available on this vault's plan`,
        );
    }
};

/**
 * Check a numeric limit on a vault's effective plan.
 */
export const getVaultPlanLimit = async (
    vaultId: string,
    key: keyof PlanLimits,
    env: Cloudflare.Env,
): Promise<number> => {
    const planId = await getVaultEffectivePlan(vaultId, env);
    return getPlanLimit(planId, key);
};

/**
 * Enforce that a single expense's attachment count fits the vault's plan limit.
 */
export const requireAttachmentCount = async (
    vaultId: string,
    count: number,
    env: Cloudflare.Env,
): Promise<void> => {
    if (count <= 0) return;
    const limit = await getVaultPlanLimit(vaultId, 'maxAttachmentsPerExpense', env);
    if (limit !== -1 && count > limit) {
        throw new Error(
            `Attachment limit exceeded: ${count} attachments, max ${limit} on this vault's plan.`,
        );
    }
};

/**
 * Look up a user's plan from the auth DB. Falls back to free.
 */
export const getUserPlan = async (
    userId: string,
    env: Cloudflare.Env,
): Promise<string> => {
    const authClient = drizzle(env.AUTH_DB, { schema: authSchema });
    const rows = await authClient
        .select({ planId: authUser.planId })
        .from(authUser)
        .where(eq(authUser.id, userId))
        .limit(1);
    return rows[0]?.planId ?? FREE_PLAN_ID;
};

/**
 * Check if the user's own plan includes the given entitlement. Use for
 * user-scoped gates (vault creation, future cross-vault features).
 */
export const checkUserEntitlement = async (
    userId: string,
    entitlement: Entitlement,
    env: Cloudflare.Env,
): Promise<boolean> => {
    const planId = await getUserPlan(userId, env);
    return hasEntitlement(planId, entitlement);
};

/**
 * Enforce a user-scoped entitlement.
 */
export const requireUserEntitlement = async (
    session: App.AuthSession,
    entitlement: Entitlement,
    env: Cloudflare.Env,
): Promise<void> => {
    const allowed = await checkUserEntitlement(session.user.id, entitlement, env);
    if (!allowed) {
        throw new Error(
            `Entitlement denied: '${entitlement}' is not available on your plan`,
        );
    }
};

/**
 * Look up a user's plan limit (e.g. maxVaults).
 */
export const getUserPlanLimit = async (
    userId: string,
    key: keyof PlanLimits,
    env: Cloudflare.Env,
): Promise<number> => {
    const planId = await getUserPlan(userId, env);
    return getPlanLimit(planId, key);
};
