import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {expenses, vaultMembers, vaults, funds} from "$lib/server/db/schema";
import {and, desc, asc, eq, isNull, sql} from "drizzle-orm";
import {categoryData} from "$lib/configurations/categories";
import {createSelectSchema} from "drizzle-valibot";
import {parse} from "valibot";
import {processDueRecurringExpenses} from "$lib/server/api/recurring-expenses/processDueRecurringExpenses";

export const getExpenses = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    options?: App.GetVaultExpensesOptions
) => {
    const client = drizzle(env.DB, { schema });
    const { page = 1, limit = 10, startDate, endDate, fundId } = options || {};
    const offset = (page - 1) * limit;

    // Lazy catch-up: materialize any due recurring occurrences so the list
    // reflects reality even if the cron hasn't run yet. Safe to fail silently —
    // worst case the user sees stale data for a moment.
    try {
        await processDueRecurringExpenses(env, { vaultId });
    } catch (error) {
        console.error({ message: 'Lazy recurring catch-up failed', vaultId, error });
    }

    let whereClause = and(
        eq(expenses.vaultId, vaultId),
        isNull(expenses.deletedAt)
    );

    if (startDate && endDate) {
        whereClause = and(
            whereClause,
            sql`${expenses.date} >= ${startDate}`,
            sql`${expenses.date} <= ${endDate}`
        );
    }

    if (fundId) {
        whereClause = and(whereClause, eq(expenses.fundId, fundId));
    }

    const expensesList = await client
        .select({
            ...expenses,
            paidByName: vaultMembers.displayName,
            fundName: funds.name,
            fundIcon: funds.icon,
        })
        .from(expenses)
        .leftJoin(vaultMembers, and(
            eq(expenses.vaultId, vaultMembers.vaultId),
            eq(expenses.paidBy, vaultMembers.userId)
        ))
        .leftJoin(funds, eq(expenses.fundId, funds.id))
        .where(whereClause)
        .orderBy(desc(expenses.date))
        .limit(limit)
        .offset(offset);

    const totalCount = await client
        .select({ count: sql`count(*)` })
        .from(expenses)
        .where(whereClause);

    const transformedExpenses = expensesList.map(row => {
        const parsedExpense = parse(createSelectSchema(expenses), row);
        return {
            id: parsedExpense.id,
            note: parsedExpense.note,
            amount: parsedExpense.amount,
            paymentType: parsedExpense.paymentType,
            date: parsedExpense.date,
            createdAt: parsedExpense.createdAt,
            paidBy: parsedExpense.paidBy || undefined,
            paidByName: row.paidByName,
            fundId: parsedExpense.fundId || null,
            fundName: row.fundName || null,
            fundIcon: row.fundIcon || null,
            templateId: parsedExpense.expenseTemplateId || null,
            recurringExpenseId: parsedExpense.recurringExpenseId || null,
            vaultId: parsedExpense.vaultId || undefined,
            category: categoryData.categories.find(c => c.name === parsedExpense.categoryName) || null,
        }
    });

    return {
        expenses: transformedExpenses,
        pagination: {
            page,
            limit,
            total: totalCount[0].count as number,
            pages: Math.ceil((totalCount[0].count as number) / limit)
        }
    };
};