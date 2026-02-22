import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundPolicies, fundTransactions } from '$lib/server/db/schema';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';

export const getFunds = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
) => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('Permission denied: not a member of this vault');

    const client = drizzle(env.DB, { schema });

    const rows = await client
        .select({
            fund: funds,
            activeCycle: fundCycles,
            policy: fundPolicies,
        })
        .from(funds)
        .leftJoin(
            fundCycles,
            and(eq(fundCycles.fundId, funds.id), eq(fundCycles.status, 'active')),
        )
        .leftJoin(fundPolicies, eq(fundPolicies.fundId, funds.id))
        .where(and(eq(funds.vaultId, vaultId), isNull(funds.deletedAt)))
        .orderBy(funds.createdAt);

    // Batch-fetch deduction totals for all active cycles
    const activeCycleIds = rows.map((r) => r.activeCycle?.id).filter(Boolean) as string[];
    const deductionMap = new Map<string, number>();
    if (activeCycleIds.length > 0) {
        const deductions = await client
            .select({
                cycleId: fundTransactions.cycleId,
                total: sql<number>`cast(sum(${fundTransactions.amount}) as real)`,
            })
            .from(fundTransactions)
            .where(and(
                inArray(fundTransactions.cycleId, activeCycleIds),
                eq(fundTransactions.type, 'deduction'),
            ))
            .groupBy(fundTransactions.cycleId);
        for (const d of deductions) deductionMap.set(d.cycleId, d.total ?? 0);
    }

    return rows.map((r) => ({
        ...r,
        activeCycle: r.activeCycle
            ? { ...r.activeCycle, totalDeducted: deductionMap.get(r.activeCycle.id) ?? 0 }
            : null,
    }));
};
