import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses } from '$lib/server/db/schema';
import { and, eq, isNull, sql, desc } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import { categoryData } from '$lib/configurations/categories';
import { clampHistoryForFree, defaultRange } from './helpers';
import type { BreakdownQuery, CategoryBreakdownItem } from '$lib/schemas/statistics';

export const getCategoryBreakdown = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: BreakdownQuery,
): Promise<CategoryBreakdownItem[]> => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    const { start: defaultStart, end: defaultEnd } = defaultRange();
    const requestedStart = query.start ?? defaultStart;
    const end = query.end ?? defaultEnd;
    const { start: clampedStart } = await clampHistoryForFree(vaultId, requestedStart, env);
    const start = clampedStart ?? defaultStart;

    const client = drizzle(env.DB, { schema });

    const rows = await client
        .select({
            categoryName: expenses.categoryName,
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
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
        .groupBy(expenses.categoryName)
        .orderBy(desc(sql`COALESCE(SUM(${expenses.amount}), 0)`));

    const categoryByName = new Map(categoryData.categories.map((c) => [c.name, c]));

    return rows.map((r) => {
        const meta = categoryByName.get(r.categoryName);
        return {
            categoryName: r.categoryName,
            categoryIcon: meta?.icon ?? null,
            categoryColor: meta?.color ?? null,
            totalAmount: r.totalAmount,
            count: r.count,
        };
    });
};
