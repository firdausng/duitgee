import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses } from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import { categoryData } from '$lib/configurations/categories';
import {
    bucketDateExpr,
    clampHistoryForFree,
    defaultRange,
    pickGranularity,
} from './helpers';
import type {
    CategoryTrendQuery,
    CategoryTrendResponse,
    TrendBucket,
} from '$lib/schemas/statistics';

export const getCategoryTrend = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: CategoryTrendQuery,
): Promise<CategoryTrendResponse> => {
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

    // Single GROUP BY pulling every (bucket, categoryName) cell. ~25 cats × ~12 buckets = trivial.
    const rows = await client
        .select({
            bucket,
            categoryName: expenses.categoryName,
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
        .groupBy(bucket, expenses.categoryName)
        .orderBy(bucket);

    // Rank categories by total across the range to pick top N.
    const totalsByCategory = new Map<string, number>();
    for (const r of rows) {
        totalsByCategory.set(r.categoryName, (totalsByCategory.get(r.categoryName) ?? 0) + r.total);
    }
    const ranked = Array.from(totalsByCategory.entries()).sort((a, b) => b[1] - a[1]);
    const topN = Math.max(1, Math.min(query.topN ?? 5, 20));
    const topNames = new Set(ranked.slice(0, topN).map(([name]) => name));

    // Build series and rollup "Other"
    const seriesMap = new Map<string, Map<string, TrendBucket>>(); // categoryName → bucket → trend
    const otherMap = new Map<string, TrendBucket>(); // bucket → trend
    for (const r of rows) {
        if (topNames.has(r.categoryName)) {
            const inner = seriesMap.get(r.categoryName) ?? new Map();
            inner.set(r.bucket, { bucket: r.bucket, total: r.total, count: r.count });
            seriesMap.set(r.categoryName, inner);
        } else {
            const existing = otherMap.get(r.bucket);
            otherMap.set(r.bucket, {
                bucket: r.bucket,
                total: (existing?.total ?? 0) + r.total,
                count: (existing?.count ?? 0) + r.count,
            });
        }
    }

    const categoryByName = new Map(categoryData.categories.map((c) => [c.name, c]));

    const series = ranked
        .filter(([name]) => topNames.has(name))
        .map(([name, totalAmount]) => {
            const meta = categoryByName.get(name);
            return {
                categoryName: name,
                categoryIcon: meta?.icon ?? null,
                categoryColor: meta?.color ?? null,
                totalAmount,
                buckets: Array.from(seriesMap.get(name)?.values() ?? []).sort((a, b) =>
                    a.bucket < b.bucket ? -1 : 1,
                ),
            };
        });

    const other = Array.from(otherMap.values()).sort((a, b) => (a.bucket < b.bucket ? -1 : 1));

    return { granularity, series, other };
};
