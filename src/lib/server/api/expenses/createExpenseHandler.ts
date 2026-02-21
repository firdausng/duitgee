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
import {attachFundToExpense} from "$lib/server/api/funds/fundExpenseHelpers";

export const createExpense = async (
    session: App.AuthSession,
    data: CreateExpense,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const expenseId = createId();
    const { templateId, fundId, fundPaymentMode, ...expenseFields } = data;
    const userId = session.user.id;

    // If expense is tagged to a fund, create the fund transaction first so we
    // can include fundTransactionId in the initial expense insert.
    let fundTransactionId: string | null = null;
    if (fundId && fundPaymentMode) {
        fundTransactionId = await attachFundToExpense(
            expenseId,
            data.vaultId,
            fundId,
            fundPaymentMode,
            data.amount,
            userId,
            env,
        );
    }

    const [expense] = await client
        .insert(expenses)
        .values({
            id: expenseId,
            ...expenseFields,
            categoryName: categoryData.categories.find(c => c.name === data.categoryName)?.name ?? data.categoryName,
            date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
            expenseTemplateId: templateId ?? null,
            fundId: fundId ?? null,
            fundPaymentMode: fundPaymentMode ?? null,
            fundTransactionId,
            ...initialAuditFields({ userId }),
        })
        .returning();

    // Update template usage if template was used
    if (templateId) {
        await client
            .update(expenseTemplates)
            .set({
                usageCount: sql`${expenseTemplates.usageCount} + 1`,
                lastUsedAt: formatISO(new UTCDate())
            })
            .where(eq(expenseTemplates.id, templateId));
    }

    return expense;
};
