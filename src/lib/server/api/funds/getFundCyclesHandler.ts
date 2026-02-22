import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundTransactions } from '$lib/server/db/schema';
import { eq, and, isNull, desc, inArray, sql } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import { checkVaultEntitlement } from '$lib/server/utils/entitlements';

export const getFundCycles = async (
    fundId: string,
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    options?: { page?: number; limit?: number },
) => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('Permission denied: not a member of this vault');

    const client = drizzle(env.DB, { schema });

    const [fund] = await client
        .select({ id: funds.id, balance: funds.balance })
        .from(funds)
        .where(and(eq(funds.id, fundId), eq(funds.vaultId, vaultId), isNull(funds.deletedAt)))
        .limit(1);

    if (!fund) throw new Error('Fund not found');

    const hasHistory = await checkVaultEntitlement(vaultId, 'fund:cycle_history', env);
    const { page = 1, limit = 10 } = options ?? {};
    const offset = (page - 1) * limit;

    // Restrict to active-only when entitlement is absent
    const whereClause = hasHistory
        ? eq(fundCycles.fundId, fundId)
        : and(eq(fundCycles.fundId, fundId), eq(fundCycles.status, 'active'));

    // Total count for pagination
    const [{ total }] = await client
        .select({ total: sql<number>`count(*)` })
        .from(fundCycles)
        .where(whereClause);

    // Paginated cycles — newest first
    const cycles = await client
        .select()
        .from(fundCycles)
        .where(whereClause)
        .orderBy(desc(fundCycles.periodStart))
        .limit(limit)
        .offset(offset);

    // Batch-fetch deduction totals for the returned cycles
    const cycleIds = cycles.map((c) => c.id);
    const deductionMap = new Map<string, number>();
    if (cycleIds.length > 0) {
        const rows = await client
            .select({
                cycleId: fundTransactions.cycleId,
                total: sql<number>`cast(sum(${fundTransactions.amount}) as real)`,
            })
            .from(fundTransactions)
            .where(and(
                inArray(fundTransactions.cycleId, cycleIds),
                eq(fundTransactions.type, 'deduction'),
            ))
            .groupBy(fundTransactions.cycleId);
        for (const r of rows) deductionMap.set(r.cycleId, r.total ?? 0);
    }

    return {
        cycles: cycles.map((c) => ({
            ...c,
            totalDeducted: deductionMap.get(c.id) ?? 0,
            // Active cycle: use live fund balance; closed cycle: use stored closing balance
            effectiveBalance: c.status === 'active' ? fund.balance : (c.closingBalance ?? 0),
        })),
        historyAllowed: hasHistory,
        pagination: {
            page,
            limit,
            total: Number(total),
            pages: Math.ceil(Number(total) / limit),
        },
    };
};
