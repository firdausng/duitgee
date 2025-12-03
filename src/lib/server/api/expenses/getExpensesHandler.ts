import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {expenses, vaultMembers, vaults} from "$lib/server/db/schema";
import {and, desc, asc, eq, isNull, sql} from "drizzle-orm";
import {categoryData} from "$lib/configurations/categories";
import {createSelectSchema} from "drizzle-valibot";
import {parse} from "valibot";

export const getExpenses = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    options?: App.GetVaultExpensesOptions
) => {
    const client = drizzle(env.DB, { schema });
    const { page = 1, limit = 10, startDate, endDate, } = options || {};
    const offset = (page - 1) * limit;

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

    const expensesList = await client
        .select({
            ...expenses,
            paidByName: vaultMembers.displayName
        })
        .from(expenses)
        .leftJoin(vaultMembers, and(
            eq(expenses.vaultId, vaultMembers.vaultId),
            eq(expenses.paidBy, vaultMembers.userId)
        ))
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
            date: parsedExpense.date,
            createdAt: parsedExpense.createdAt,
            paidBy: parsedExpense.paidBy || undefined,
            paidByName: row.paidByName,
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