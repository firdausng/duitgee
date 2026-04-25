import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses } from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { subMonths, startOfMonth, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';

export interface MonthlyHistoryPoint {
    /** YYYY-MM */
    month: string;
    total: number;
}

export interface CategoryMonthlyHistoryPoint {
    /** YYYY-MM */
    month: string;
    categoryName: string;
    total: number;
}

export interface MonthlyHistoryResult {
    /** Earliest to latest. Always exactly `monthsBack + 1` entries (gaps backfilled with 0). */
    overall: MonthlyHistoryPoint[];
    /** All (month, categoryName) cells where total > 0. Caller pivots into per-category series. */
    byCategory: CategoryMonthlyHistoryPoint[];
}

/**
 * Fetch the last N+1 calendar months ending at `anchor` (defaults to now), with
 * (a) the overall monthly total and (b) per-category monthly totals.
 *
 * Two queries; both indexed on (vaultId, date). Designed for the AI insights
 * handler — small payload, fast.
 */
export const getMonthlyHistory = async (
    vaultId: string,
    env: Cloudflare.Env,
    monthsBack = 5,
    anchor?: Date,
): Promise<MonthlyHistoryResult> => {
    const client = drizzle(env.DB, { schema });

    const end = anchor ?? new UTCDate();
    const startMonth = startOfMonth(subMonths(end, monthsBack));
    const startIso = formatISO(startMonth);
    const endIso = formatISO(end);

    const monthBucket = sql<string>`strftime('%Y-%m', ${expenses.date})`;

    // Overall total per month
    const overallRows = await client
        .select({
            month: monthBucket,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
            and(
                eq(expenses.vaultId, vaultId),
                isNull(expenses.deletedAt),
                sql`${expenses.date} >= ${startIso}`,
                sql`${expenses.date} <= ${endIso}`,
            ),
        )
        .groupBy(monthBucket)
        .orderBy(monthBucket);

    // Backfill missing months with zeros so the LLM sees a complete series.
    const allMonths: string[] = [];
    for (let i = monthsBack; i >= 0; i--) {
        const d = subMonths(end, i);
        allMonths.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    const overallMap = new Map(overallRows.map((r) => [r.month, r.total]));
    const overall: MonthlyHistoryPoint[] = allMonths.map((month) => ({
        month,
        total: overallMap.get(month) ?? 0,
    }));

    // Per-category per-month
    const byCategoryRows = await client
        .select({
            month: monthBucket,
            categoryName: expenses.categoryName,
            total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
            and(
                eq(expenses.vaultId, vaultId),
                isNull(expenses.deletedAt),
                sql`${expenses.date} >= ${startIso}`,
                sql`${expenses.date} <= ${endIso}`,
            ),
        )
        .groupBy(monthBucket, expenses.categoryName)
        .orderBy(monthBucket);

    const byCategory: CategoryMonthlyHistoryPoint[] = byCategoryRows.map((r) => ({
        month: r.month,
        categoryName: r.categoryName,
        total: r.total,
    }));

    return { overall, byCategory };
};
