import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { vaults, vaultMembers, vaultPlanCoverage } from '$lib/server/db/schema';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import {
    FREE_PLAN_ID,
    PRO_PLAN_ID,
    getPlanById,
} from '$lib/configurations/plans';
import { getUserPlan, getVaultEffectivePlan } from '$lib/server/utils/entitlements';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
    if (platform === undefined) {
        throw new Error('No platform');
    }
    const session = locals.currentSession;
    const userId = session.user.id;
    const env = platform.env;
    const client = drizzle(env.DB, { schema });

    const userPlanId = await getUserPlan(userId, env);
    const userPlan = getPlanById(userPlanId);

    // Vaults the user owns or admins — these are the only ones their Pro can shine onto.
    const adminVaults = await client
        .select({
            id: vaults.id,
            name: vaults.name,
            icon: vaults.icon,
            createdAt: vaults.createdAt,
            role: vaultMembers.role,
        })
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
        .orderBy(asc(vaults.createdAt));

    // For each, resolve the effective plan so we can mark it covered/uncovered.
    const adminVaultsWithPlan = await Promise.all(
        adminVaults.map(async (v) => ({
            ...v,
            effectivePlanId: await getVaultEffectivePlan(v.id, env),
        })),
    );

    // User's explicit coverage picks (empty = deterministic order applies).
    const explicitCoverage = userPlanId === PRO_PLAN_ID
        ? await client
              .select({ vaultId: vaultPlanCoverage.vaultId })
              .from(vaultPlanCoverage)
              .where(eq(vaultPlanCoverage.userId, userId))
        : [];

    return {
        userPlan,
        userPlanId,
        adminVaults: adminVaultsWithPlan,
        explicitCoverage: explicitCoverage.map((c) => c.vaultId),
        proPlan: getPlanById(PRO_PLAN_ID),
        freePlan: getPlanById(FREE_PLAN_ID),
    };
};
