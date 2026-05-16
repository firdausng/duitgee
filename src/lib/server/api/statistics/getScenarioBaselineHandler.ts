import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    expenses,
    expenseTemplates,
    incomeEntries,
    incomeTemplates,
    recurringExpenses,
    recurringIncome,
} from '$lib/server/db/schema';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { parseBreakdown } from '$lib/server/api/income/breakdownHelpers';
import { resolveBreakdown } from '$lib/utils/breakdown';
import { defaultRange } from './helpers';
import type { AllowanceLine, DeductionLine } from '$lib/schemas/income';
import type { BreakdownQuery } from '$lib/schemas/statistics';

export type ScenarioRecurringIncome = {
    ruleId: string;
    name: string;
    icon: string | null;
    sourceName: string | null;
    perPeriod: {
        baseAmount: number;
        gross: number;
        net: number;
        deductionsTotal: number;
    };
    breakdown: {
        allowances: AllowanceLine[];
        deductions: DeductionLine[];
    };
};

export type ScenarioRecurringExpense = {
    ruleId: string;
    name: string;
    icon: string | null;
    perPeriod: number;
};

export interface ScenarioBaseline {
    period: { start: string; end: string };
    real: {
        income: number;
        expense: number;
        deductions: number;
        net: number;
    };
    recurringIncome: ScenarioRecurringIncome[];
    recurringExpenses: ScenarioRecurringExpense[];
    /** One-off totals = period totals minus what the recurring rules contributed.
     *  Pass through unchanged on the scenario side (only recurring is permutable). */
    oneOffIncome: number;
    oneOffExpense: number;
}

/**
 * Single read powering the /scenarios page. Returns the real cash flow for the
 * period AND the configured per-period contributions of every active recurring
 * rule. The client overlays overrides on top of these to compute scenarios
 * locally without round-trips.
 *
 * Permission: canViewIncome (the page exposes income; members without it
 * shouldn't reach this surface).
 */
export const getScenarioBaseline = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: BreakdownQuery,
): Promise<ScenarioBaseline> => {
    await requireVaultPermission(session, vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });
    const { start: defaultStart, end: defaultEnd } = defaultRange();
    const start = query.start ?? defaultStart;
    const end = query.end ?? defaultEnd;

    // ─── Real totals for the period ─────────────────────────────────────
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

    // ─── Active recurring income rules + their breakdown ────────────────
    const incomeRuleRows = await client
        .select({
            rule: recurringIncome,
            templateName: incomeTemplates.name,
            templateIcon: incomeTemplates.icon,
            templateDefaultAmount: incomeTemplates.defaultAmount,
            templateAllowances: incomeTemplates.defaultAllowances,
            templateDeductions: incomeTemplates.defaultDeductions,
            templateSourceId: incomeTemplates.sourceId,
        })
        .from(recurringIncome)
        .leftJoin(incomeTemplates, eq(recurringIncome.templateId, incomeTemplates.id))
        .where(
            and(
                eq(recurringIncome.vaultId, vaultId),
                eq(recurringIncome.status, 'active'),
                isNull(recurringIncome.deletedAt),
            ),
        );

    const recurringIncomeResult: ScenarioRecurringIncome[] = incomeRuleRows.map((row) => {
        const baseAmount = row.rule.amountOverride ?? row.templateDefaultAmount ?? 0;
        const allowances = parseBreakdown<AllowanceLine>(row.templateAllowances) ?? [];
        const deductionLines = parseBreakdown<DeductionLine>(row.templateDeductions) ?? [];
        const { gross, deductionsTotal, net } = resolveBreakdown(baseAmount, allowances, deductionLines);
        return {
            ruleId: row.rule.id,
            name: row.rule.name ?? row.templateName ?? 'Recurring income',
            icon: row.templateIcon ?? null,
            sourceName: null, // intentionally omitted to keep the payload small; UI can show template icon as the visual marker
            perPeriod: { baseAmount, gross, net, deductionsTotal },
            breakdown: { allowances, deductions: deductionLines },
        };
    });

    // ─── Active recurring expense rules ─────────────────────────────────
    const expenseRuleRows = await client
        .select({
            rule: recurringExpenses,
            templateName: expenseTemplates.name,
            templateIcon: expenseTemplates.icon,
            templateDefaultAmount: expenseTemplates.defaultAmount,
        })
        .from(recurringExpenses)
        .leftJoin(expenseTemplates, eq(recurringExpenses.templateId, expenseTemplates.id))
        .where(
            and(
                eq(recurringExpenses.vaultId, vaultId),
                eq(recurringExpenses.status, 'active'),
                isNull(recurringExpenses.deletedAt),
            ),
        );

    const recurringExpensesResult: ScenarioRecurringExpense[] = expenseRuleRows.map((row) => ({
        ruleId: row.rule.id,
        name: row.rule.name ?? row.templateName ?? 'Recurring expense',
        icon: row.templateIcon ?? null,
        perPeriod: row.rule.amountOverride ?? row.templateDefaultAmount ?? 0,
    }));

    // ─── One-off totals = real - recurring contributions ────────────────
    // We sum the recurring rules' per-period amounts and subtract from the
    // real totals. The result is the "unmovable" non-recurring slice the
    // scenario passes through unchanged.
    const recurringIncomeContribution = recurringIncomeResult.reduce(
        (s, r) => s + r.perPeriod.gross,
        0,
    );
    const recurringExpenseContribution =
        recurringExpensesResult.reduce((s, r) => s + r.perPeriod, 0) +
        recurringIncomeResult.reduce((s, r) => s + r.perPeriod.deductionsTotal, 0);

    const oneOffIncome = Math.max(0, Math.round((income - recurringIncomeContribution) * 100) / 100);
    const oneOffExpense = Math.max(0, Math.round((expense - recurringExpenseContribution) * 100) / 100);

    return {
        period: { start, end },
        real: {
            income: Math.round(income * 100) / 100,
            expense: Math.round(expense * 100) / 100,
            deductions: Math.round(deductions * 100) / 100,
            net: Math.round((income - expense) * 100) / 100,
        },
        recurringIncome: recurringIncomeResult,
        recurringExpenses: recurringExpensesResult,
        oneOffIncome,
        oneOffExpense,
    };
};
