import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses, vaultMembers } from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { subDays, formatISO } from 'date-fns';

export interface AnomalyItem {
    amount: number;
    categoryName: string;
    /** YYYY-MM-DD */
    date: string;
    paidByName: string | null;
    /** Truncated to ~60 chars. */
    note: string | null;
    /** Amount as a multiple of the category's trailing mean. e.g. 3.2 → "3.2x typical". */
    multiple: number;
    /** Trailing-window mean for the category (used by the LLM for context). */
    categoryAverage: number;
}

/**
 * Detect transaction-level outliers within `[periodStart, periodEnd]` using a
 * trailing baseline window (default 90 days BEFORE periodStart) per category.
 *
 * Rules:
 *   - Need ≥ 5 baseline expenses in the category — otherwise stats are too noisy to flag.
 *   - z-score ≥ 2 (statistical outlier in its category).
 *   - Amount ≥ 1.5 × category mean (filters out tight distributions where 2σ is still small).
 *
 * Returns up to `topN` outliers ranked by z-score.
 */
export const detectAnomalies = async (
    vaultId: string,
    env: Cloudflare.Env,
    periodStart: string,
    periodEnd: string,
    topN = 5,
    baselineDays = 90,
): Promise<AnomalyItem[]> => {
    const client = drizzle(env.DB, { schema });

    // Baseline window: `baselineDays` ending the moment before the period.
    const baselineEnd = formatISO(new Date(new Date(periodStart).getTime() - 1));
    const baselineStart = formatISO(subDays(new Date(periodStart), baselineDays));

    // 1. Per-category baseline stats (mean + stddev) from the trailing window.
    //    SQLite doesn't have STDDEV; compute via SUM/SUM_SQ.
    const baselineRows = await client
        .select({
            categoryName: expenses.categoryName,
            count: sql<number>`COUNT(*)`,
            sum: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            sumSq: sql<number>`COALESCE(SUM(${expenses.amount} * ${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
            and(
                eq(expenses.vaultId, vaultId),
                isNull(expenses.deletedAt),
                sql`${expenses.date} >= ${baselineStart}`,
                sql`${expenses.date} <= ${baselineEnd}`,
            ),
        )
        .groupBy(expenses.categoryName);

    const baselineByCategory = new Map<string, { mean: number; stddev: number; count: number }>();
    for (const r of baselineRows) {
        if (r.count < 5) continue; // not enough data to be meaningful
        const mean = r.sum / r.count;
        // Population stddev. Underestimates vs sample stddev for small samples,
        // but the count >= 5 guard already trims the worst cases.
        const variance = Math.max(0, r.sumSq / r.count - mean * mean);
        const stddev = Math.sqrt(variance);
        baselineByCategory.set(r.categoryName, { mean, stddev, count: r.count });
    }

    if (baselineByCategory.size === 0) return [];

    // 2. Pull period expenses with member display name. We project only the
    //    fields needed for outlier scoring + LLM context.
    const periodRows = await client
        .select({
            amount: expenses.amount,
            categoryName: expenses.categoryName,
            date: expenses.date,
            paidByName: vaultMembers.displayName,
            note: expenses.note,
        })
        .from(expenses)
        .leftJoin(
            vaultMembers,
            and(
                eq(expenses.vaultId, vaultMembers.vaultId),
                eq(expenses.paidBy, vaultMembers.userId),
            ),
        )
        .where(
            and(
                eq(expenses.vaultId, vaultId),
                isNull(expenses.deletedAt),
                sql`${expenses.date} >= ${periodStart}`,
                sql`${expenses.date} <= ${periodEnd}`,
            ),
        );

    // 3. Score each expense; keep the top-N by z-score.
    interface Scored extends AnomalyItem {
        z: number;
    }
    const scored: Scored[] = [];

    for (const row of periodRows) {
        const baseline = baselineByCategory.get(row.categoryName);
        if (!baseline) continue;
        if (baseline.stddev <= 0) continue;

        const z = (row.amount - baseline.mean) / baseline.stddev;
        if (z < 2) continue;
        if (row.amount < baseline.mean * 1.5) continue;

        scored.push({
            z,
            amount: Math.round(row.amount * 100) / 100,
            categoryName: row.categoryName,
            date: (row.date ?? '').slice(0, 10),
            paidByName: row.paidByName ?? null,
            note: row.note ? row.note.slice(0, 60) : null,
            multiple: Math.round((row.amount / baseline.mean) * 10) / 10,
            categoryAverage: Math.round(baseline.mean * 100) / 100,
        });
    }

    scored.sort((a, b) => b.z - a.z);

    // Return without the internal z-score — the LLM doesn't need it; multiple is more readable.
    return scored.slice(0, topN).map(({ z: _z, ...rest }) => rest);
};
