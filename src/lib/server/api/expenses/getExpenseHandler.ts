import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {expenses} from "$lib/server/db/schema";
import {and, eq} from "drizzle-orm";
import {paymentData} from "$lib/configurations/payments";
import {categoryData} from "$lib/configurations/categories";

export const getExpense = async (
    vaultId: string,
    expenseId: string,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });

    const [expenseResult] = await client
        .select()
        .from(expenses)
        .where(
            and(
                eq(expenses.id, expenseId),
                eq(expenses.vaultId, vaultId)
            )
        )
        .limit(1);

    if (!expenseResult) {
        return undefined;
    }

    // Transform to match our Expense type with additional fields
    return {
        id: expenseResult.id,
        note: expenseResult.note,
        amount: expenseResult.amount,
        paymentType: expenseResult.paymentType,
        date: expenseResult.date,
        paidBy: expenseResult.paidBy,
        createdAt: expenseResult.createdAt,
        vaultId: expenseResult.vaultId || undefined,
        vault: null, // Not included in this query
        category: categoryData.categories.find(c => c.name === expenseResult.categoryName) || null,
        fundId: expenseResult.fundId ?? null,
        fundPaymentMode: expenseResult.fundPaymentMode ?? null,
    };
};