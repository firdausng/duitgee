import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {CreateExpense} from "$lib/schemas/expenses";
import {createId} from "@paralleldrive/cuid2";
import {categoryData} from "$lib/configurations/categories";
import {initialAuditFields} from "$lib/server/utils/audit";
import {paymentData} from "$lib/configurations/payments";
import {expenses} from "$lib/server/db/schema";

export const createExpense = async (
    userId: string,
    data: CreateExpense,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const expenseId = createId();
    const { templateId, paymentType, ...expenseFields } = data;

    const expenseData = {
        id: expenseId,
        ...expenseFields,
        userId,
        categoryName: categoryData.categories.find(c => c.name === data.categoryName)?.name || null,
        paymentType: paymentData.paymentTypes.find(p => p.code === paymentType)?.code || null,
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        ...initialAuditFields({ userId })
    };

    const expense = await client
        .insert(expenses)
        .values({
            ...expenseData,
            categoryName: data.categoryName,
        })
        .returning();

    return expense[0];
};