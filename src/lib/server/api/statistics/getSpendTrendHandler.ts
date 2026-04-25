import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses } from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import {
    bucketDateExpr,
    clampHistoryForFree,
    defaultRange,
    pickGranularity,
    previousPeriod,
} from './helpers';
import type { SpendTrendQuery, SpendTrendResponse, TrendBucket } from '$lib/schemas/statistics';

const fetchBuckets = async (
    client: ReturnType<typeof drizzle<typeof schema>>,
    vaultId: string,
    start: string,
    end: string,
    granularity: ReturnType<typeof pickGranularity>,
): Promise<TrendBucket[]> => {
    const bucket = bucketDateExpr(granularity);
    const rows = await client
        .select({
            bucket,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .where(
            and(
                eq(expenses.vaultId, vaultId),
                isNull(expenses.deletedAt),
                sql`${expenses.date} >= ${start}`,
                sql`${expenses.date} <= ${end}`,
            ),
        )
        .groupBy(bucket)
        .orderBy(bucket);

    return rows.map((r) => ({
        bucket: r.bucket,
        total: r.total,
        count: r.count,
    }));
};

export const getSpendTrend = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: SpendTrendQuery,
): Promise<SpendTrendResponse> => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    const { start: defaultStart, end: defaultEnd } = defaultRange();
    const requestedStart = query.start ?? defaultStart;
    const end = query.end ?? defaultEnd;

    const { start: clampedStart, truncated } = await clampHistoryForFree(
        vaultId,
        requestedStart,
        env,
    );
    const start = clampedStart ?? defaultStart;

    const granularity = pickGranularity(new Date(start), new Date(end), query.granularity);

    const client = drizzle(env.DB, { schema });
    const current = await fetchBuckets(client, vaultId, start, end, granularity);

    let previous: TrendBucket[] | null = null;
    if (query.compare === 'prev') {
        const { start: prevStart, end: prevEnd } = previousPeriod(start, end);
        previous = await fetchBuckets(client, vaultId, prevStart, prevEnd, granularity);
    }

    return {
        granularity,
        current,
        previous,
        truncated,
    };
};
