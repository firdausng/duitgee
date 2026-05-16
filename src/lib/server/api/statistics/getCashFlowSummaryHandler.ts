import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses, incomeEntries } from '$lib/server/db/schema';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { defaultRange } from './helpers';
import type { BreakdownQuery } from '$lib/schemas/statistics';

export interface CashFlowSummary {
    /** Total income (incomeEntries.amount) over the period. */
    income: number;
    /** All expenses over the period, INCLUDING salary deductions. */
    expense: number;
    /** Expenses excluding salary deductions — discretionary spending. */
    expenseExDeductions: number;
    /** Sum of expenses where incomeEntryId IS NOT NULL — the deduction slice. */
    deductions: number;
    /** income − expense (treats deductions as spending). */
    net: number;
    /** income − expenseExDeductions (treats deductions as a tax line, not spending). */
    netExDeductions: number;
    /** Date range used for the computation, useful for the UI period label. */
    start: string;
    end: string;
}

/**
 * Compute a period's cash-flow summary — income vs expense vs deductions vs
 * net. Used by the Cash flow card on the statistics dashboard.
 *
 * Requires canViewIncome. Surface as a separate handler (not bolted onto
 * the existing spend-trend handler) so the dashboard can gracefully skip it
 * for members without the permission.
 */
export const getCashFlowSummary = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: BreakdownQuery,
): Promise<CashFlowSummary> => {
    await requireVaultPermission(session, vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });

    const { start: defaultStart, end: defaultEnd } = defaultRange();
    const start = query.start ?? defaultStart;
    const end = query.end ?? defaultEnd;

    // Three independent queries — D1 doesn't batch SELECT, parallelize via Promise.all.
    const [incomeRow, expenseRow, deductionRow] = await Promise.all([
        client
            .select({ total: sql<number>`COALESCE(SUM(${incomeEntries.amount}), 0)` })
            .from(incomeEntries)
            .where(
                and(
                    eq(incomeEntries.vaultId, vaultId),
                    isNull(incomeEntries.deletedAt),
                    sql`${incomeEntries.date} >= ${start}`,
                    sql`${incomeEntries.date} <= ${end}`,
                ),
            ),
        client
            .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
            .from(expenses)
            .where(
                and(
                    eq(expenses.vaultId, vaultId),
                    isNull(expenses.deletedAt),
                    sql`${expenses.date} >= ${start}`,
                    sql`${expenses.date} <= ${end}`,
                ),
            ),
        client
            .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
            .from(expenses)
            .where(
                and(
                    eq(expenses.vaultId, vaultId),
                    isNull(expenses.deletedAt),
                    isNotNull(expenses.incomeEntryId),
                    sql`${expenses.date} >= ${start}`,
                    sql`${expenses.date} <= ${end}`,
                ),
            ),
    ]);

    const income = Number(incomeRow[0]?.total ?? 0);
    const expense = Number(expenseRow[0]?.total ?? 0);
    const deductions = Number(deductionRow[0]?.total ?? 0);
    const expenseExDeductions = Math.max(0, Math.round((expense - deductions) * 100) / 100);

    return {
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100,
        expenseExDeductions,
        deductions: Math.round(deductions * 100) / 100,
        net: Math.round((income - expense) * 100) / 100,
        netExDeductions: Math.round((income - expenseExDeductions) * 100) / 100,
        start,
        end,
    };
};
