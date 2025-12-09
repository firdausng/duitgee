import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import { expenses, expenseTemplates, vaultMembers } from "$lib/server/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { checkVaultPermission } from "$lib/server/utils/vaultPermissions";
import { categoryData } from "$lib/configurations/categories";

export const getVaultStatistics = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    options?: { startDate?: string; endDate?: string }
) => {
    const client = drizzle(env.DB, { schema });
    const { startDate, endDate } = options || {};

    // Check if user has access to this vault
    const hasAccess = await checkVaultPermission(session.user.id, vaultId, 'canEditVault', env);
    if (!hasAccess) {
        throw new Error('You do not have access to this vault');
    }

    // Build base where clause
    let baseWhereClause = and(
        eq(expenses.vaultId, vaultId),
        isNull(expenses.deletedAt)
    );

    // Add date range filter if provided
    if (startDate && endDate) {
        baseWhereClause = and(
            baseWhereClause,
            sql`${expenses.date} >= ${startDate}`,
            sql`${expenses.date} <= ${endDate}`
        );
    }

    // Get total expenses and count
    const [totals] = await client
        .select({
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .where(baseWhereClause);

    // Get expenses by template
    const expensesByTemplate = await client
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

    // Get expenses by category
    const expensesByCategory = await client
        .select({
            categoryName: expenses.categoryName,
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .where(baseWhereClause)
        .groupBy(expenses.categoryName);

    // Get expenses by member
    const expensesByMember = await client
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

    // Create a map of category names to category data for quick lookup
    const categoryMap = new Map(
        categoryData.categories.map(cat => [cat.name, cat])
    );

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
    };
};
