import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import { expenses, expenseTemplates, expenseTags, expenseTagAssignments, vaultMembers } from "$lib/server/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { getUserVaultRole } from "$lib/server/utils/vaultPermissions";
import { categoryData } from "$lib/configurations/categories";
import { getExpenses } from "$lib/server/api/expenses/getExpensesHandler";

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

type GetVaultStatisticsOptions = {
    startDate?: string;
    endDate?: string;
    fundId?: string;
    /**
     * When provided, also returns a `prior` block with totals for the prior
     * period — used by SpendHeroCard's "vs. last period" delta caption.
     * Inherits the current request's fundId filter.
     */
    prior?: { startDate: string; endDate: string };
    /**
     * When true, returns `allTimeCount` — total expense count ignoring any
     * date or fund filter. Drives the empty-vault checklist.
     */
    includeAllTimeCount?: boolean;
    /**
     * When provided, returns `recentExpenses` — the most recent N expenses
     * matching the same date/fund filter, with full tag/attachment expansion.
     * Avoids a second round-trip to /getExpenses for the home dashboard.
     */
    recentExpenses?: { limit: number; page?: number };
};

const totalsAggregate = (client: DrizzleClient, whereClause: ReturnType<typeof and>) =>
    client
        .select({
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .where(whereClause);

export const getVaultStatistics = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    options?: GetVaultStatisticsOptions,
) => {
    const client = drizzle(env.DB, { schema });
    const { startDate, endDate, fundId, prior, includeAllTimeCount, recentExpenses } = options || {};

    // Any active vault member can read statistics
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) {
        throw new Error('You do not have access to this vault');
    }

    const buildWhere = (range?: { startDate?: string; endDate?: string }) => {
        let clause = and(eq(expenses.vaultId, vaultId), isNull(expenses.deletedAt));
        if (range?.startDate && range?.endDate) {
            clause = and(
                clause,
                sql`${expenses.date} >= ${range.startDate}`,
                sql`${expenses.date} <= ${range.endDate}`,
            );
        }
        if (fundId) {
            clause = and(clause, eq(expenses.fundId, fundId));
        }
        return clause;
    };

    const baseWhereClause = buildWhere({ startDate, endDate });

    const totalsP = totalsAggregate(client, baseWhereClause);

    const byTemplateP = client
        .select({
            templateId: expenses.expenseTemplateId,
            templateName: expenseTemplates.name,
            templateIcon: expenseTemplates.icon,
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .leftJoin(expenseTemplates, eq(expenses.expenseTemplateId, expenseTemplates.id))
        .where(baseWhereClause)
        .groupBy(expenses.expenseTemplateId, expenseTemplates.name, expenseTemplates.icon);

    const byCategoryP = client
        .select({
            categoryName: expenses.categoryName,
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .where(baseWhereClause)
        .groupBy(expenses.categoryName);

    const byMemberP = client
        .select({
            userId: expenses.paidBy,
            displayName: vaultMembers.displayName,
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .leftJoin(vaultMembers, and(
            eq(expenses.vaultId, vaultMembers.vaultId),
            eq(expenses.paidBy, vaultMembers.userId)
        ))
        .where(baseWhereClause)
        .groupBy(expenses.paidBy, vaultMembers.displayName);

    // An expense with N tags counts toward each — sums will exceed total.
    // Restricted to non-deleted tags in this vault to avoid leaking labels.
    const byTagP = client
        .select({
            tagId: expenseTags.id,
            tagName: expenseTags.name,
            tagColor: expenseTags.color,
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .innerJoin(expenseTagAssignments, eq(expenses.id, expenseTagAssignments.expenseId))
        .innerJoin(expenseTags, and(
            eq(expenseTagAssignments.tagId, expenseTags.id),
            eq(expenseTags.vaultId, vaultId),
            isNull(expenseTags.deletedAt),
        ))
        .where(baseWhereClause)
        .groupBy(expenseTags.id, expenseTags.name, expenseTags.color);

    const priorP = prior
        ? totalsAggregate(client, buildWhere(prior))
        : Promise.resolve(null);

    // Skip the fund filter for all-time count — it powers the empty-vault
    // checklist, which asks "has this vault ever had any activity at all?"
    const allTimeP = includeAllTimeCount
        ? client
            .select({ count: sql<number>`COUNT(*)` })
            .from(expenses)
            .where(and(eq(expenses.vaultId, vaultId), isNull(expenses.deletedAt)))
        : Promise.resolve(null);

    const recentP = recentExpenses
        ? getExpenses(vaultId, session, env, {
            page: recentExpenses.page ?? 1,
            limit: recentExpenses.limit,
            startDate,
            endDate,
            fundId,
        })
        : Promise.resolve(null);

    const [totalsRows, expensesByTemplate, expensesByCategory, expensesByMember, expensesByTag, priorTotalsRows, allTimeRows, recentResult] =
        await Promise.all([totalsP, byTemplateP, byCategoryP, byMemberP, byTagP, priorP, allTimeP, recentP]);

    const totals = totalsRows[0];
    const categoryMap = new Map(categoryData.categories.map(cat => [cat.name, cat]));

    return {
        total: {
            amount: totals.totalAmount,
            count: totals.count,
        },
        byTemplate: expensesByTemplate.map(item => ({
            templateId: item.templateId,
            templateName: item.templateName || 'No Template',
            templateIcon: item.templateIcon || '📝',
            totalAmount: item.totalAmount,
            count: item.count,
        })),
        byCategory: expensesByCategory.map(item => {
            const categoryInfo = categoryMap.get(item.categoryName);
            return {
                categoryName: item.categoryName,
                categoryIcon: categoryInfo?.icon,
                categoryIconType: categoryInfo?.iconType,
                totalAmount: item.totalAmount,
                count: item.count,
            };
        }),
        byMember: expensesByMember.map(item => ({
            userId: item.userId,
            displayName: item.displayName || 'Vault-level expense',
            totalAmount: item.totalAmount,
            count: item.count,
        })),
        byTag: expensesByTag.map(item => ({
            tagId: item.tagId,
            tagName: item.tagName,
            tagColor: item.tagColor,
            totalAmount: item.totalAmount,
            count: item.count,
        })),
        prior: priorTotalsRows
            ? {
                total: {
                    amount: priorTotalsRows[0].totalAmount,
                    count: priorTotalsRows[0].count,
                },
            }
            : null,
        allTimeCount: allTimeRows ? Number(allTimeRows[0].count ?? 0) : null,
        recentExpenses: recentResult,
    };
};
