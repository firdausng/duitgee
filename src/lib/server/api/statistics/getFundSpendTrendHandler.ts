import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses, funds } from '$lib/server/db/schema';
import { and, eq, isNull, sql, isNotNull } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import {
    bucketDateExpr,
    clampHistoryForFree,
    defaultRange,
    pickGranularity,
} from './helpers';
import type {
    SpendTrendQuery,
    FundSpendTrendResponse,
    TrendBucket,
} from '$lib/schemas/statistics';

export const getFundSpendTrend = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: SpendTrendQuery,
): Promise<FundSpendTrendResponse> => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    const { start: defaultStart, end: defaultEnd } = defaultRange();
    const requestedStart = query.start ?? defaultStart;
    const end = query.end ?? defaultEnd;
    const { start: clampedStart } = await clampHistoryForFree(vaultId, requestedStart, env);
    const start = clampedStart ?? defaultStart;

    const granularity = pickGranularity(new Date(start), new Date(end), query.granularity);
    const bucket = bucketDateExpr(granularity);

    const client = drizzle(env.DB, { schema });

    const rows = await client
        .select({
            fundId: expenses.fundId,
            fundName: funds.name,
            fundIcon: funds.icon,
            fundColor: funds.color,
            bucket,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .innerJoin(funds, eq(expenses.fundId, funds.id))
        .where(
            and(
                eq(expenses.vaultId, vaultId),
                isNull(expenses.deletedAt),
                isNotNull(expenses.fundId),
                sql`${expenses.date} >= ${start}`,
                sql`${expenses.date} <= ${end}`,
            ),
        )
        .groupBy(expenses.fundId, funds.name, funds.icon, funds.color, bucket)
        .orderBy(bucket);

    // Group rows by fund.
    const byFund = new Map<
        string,
        {
            fundId: string;
            fundName: string;
            fundIcon: string | null;
            fundColor: string | null;
            buckets: TrendBucket[];
            totalAmount: number;
        }
    >();
    for (const r of rows) {
        if (!r.fundId) continue;
        const existing = byFund.get(r.fundId);
        const trend: TrendBucket = { bucket: r.bucket, total: r.total, count: r.count };
        if (existing) {
            existing.buckets.push(trend);
            existing.totalAmount += r.total;
        } else {
            byFund.set(r.fundId, {
                fundId: r.fundId,
                fundName: r.fundName ?? 'Unknown fund',
                fundIcon: r.fundIcon ?? null,
                fundColor: r.fundColor ?? null,
                buckets: [trend],
                totalAmount: r.total,
            });
        }
    }

    const fundsArr = Array.from(byFund.values()).sort((a, b) => b.totalAmount - a.totalAmount);

    return {
        granularity,
        funds: fundsArr,
    };
};
