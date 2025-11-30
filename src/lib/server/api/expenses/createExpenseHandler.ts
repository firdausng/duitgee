import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {CreateExpense} from "$lib/schemas/expenses";
import {createId} from "@paralleldrive/cuid2";
import {categoryData} from "$lib/configurations/categories";
import {initialAuditFields} from "$lib/server/utils/audit";
import {expenses, expenseTemplates} from "$lib/server/db/schema";
import {eq, sql} from "drizzle-orm";
import {formatISO} from "date-fns";
import {UTCDate} from "@date-fns/utc";

export const createExpense = async (
    session: App.AuthSession,
    data: CreateExpense,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const expenseId = createId();
    const { templateId, ...expenseFields } = data;
    const userId = session.user.id;

    const expenseData = {
        id: expenseId,
        ...expenseFields,
        userId,
        categoryName: categoryData.categories.find(c => c.name === data.categoryName)?.name || null,
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        expenseTemplateId: templateId || null,
        ...initialAuditFields({ userId })
    };

    const expense = await client
        .insert(expenses)
        .values({
            ...expenseData,
            categoryName: data.categoryName,
        })
        .returning();

    // Update template usage if template was used
    // if (templateId) {
    //     await client
    //         .update(expenseTemplates)
    //         .set({
    //             usageCount: sql`${expenseTemplates.usageCount} + 1`,
    //             lastUsedAt: formatISO(new UTCDate())
    //         })
    //         .where(eq(expenseTemplates.id, templateId));
    // }

    return expense[0];
};