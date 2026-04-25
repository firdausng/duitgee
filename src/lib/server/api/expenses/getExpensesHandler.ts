import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {expenses, vaultMembers, vaults, funds, expenseTags, expenseTagAssignments, attachments, expenseAttachments} from "$lib/server/db/schema";
import {and, desc, asc, eq, inArray, isNull, sql} from "drizzle-orm";
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

    const expenseIds = expensesList.map(e => e.id);

    // Fetch tag and attachment assignments for the page, then group by expense.
    // D1 caps each query at ~100 bound parameters, so an `inArray(col, ids)` with
    // 100+ expense IDs blows the limit. We chunk to stay safely under it.
    const tagsByExpense = new Map<string, Array<{ id: string; name: string; color: string | null }>>();
    const attachmentsByExpense = new Map<string, Array<{ id: string; fileName: string; mimeType: string; fileSize: number }>>();

    const D1_PARAM_CHUNK = 50;
    const idChunks: string[][] = [];
    for (let i = 0; i < expenseIds.length; i += D1_PARAM_CHUNK) {
        idChunks.push(expenseIds.slice(i, i + D1_PARAM_CHUNK));
    }

    if (idChunks.length > 0) {
        // All chunked queries run in parallel — each individual query stays
        // under D1's 100-parameter limit.
        const [tagBatches, attachmentBatches] = await Promise.all([
            Promise.all(
                idChunks.map((batch) =>
                    client
                        .select({
                            expenseId: expenseTagAssignments.expenseId,
                            id: expenseTags.id,
                            name: expenseTags.name,
                            color: expenseTags.color,
                        })
                        .from(expenseTagAssignments)
                        .innerJoin(expenseTags, eq(expenseTagAssignments.tagId, expenseTags.id))
                        .where(and(
                            inArray(expenseTagAssignments.expenseId, batch),
                            isNull(expenseTags.deletedAt),
                        )),
                ),
            ),
            Promise.all(
                idChunks.map((batch) =>
                    client
                        .select({
                            expenseId: expenseAttachments.expenseId,
                            id: attachments.id,
                            fileName: attachments.fileName,
                            mimeType: attachments.mimeType,
                            fileSize: attachments.fileSize,
                        })
                        .from(expenseAttachments)
                        .innerJoin(attachments, eq(expenseAttachments.attachmentId, attachments.id))
                        .where(and(
                            inArray(expenseAttachments.expenseId, batch),
                            isNull(attachments.deletedAt),
                        )),
                ),
            ),
        ]);

        for (const row of tagBatches.flat()) {
            const list = tagsByExpense.get(row.expenseId) ?? [];
            list.push({ id: row.id, name: row.name, color: row.color });
            tagsByExpense.set(row.expenseId, list);
        }
        for (const row of attachmentBatches.flat()) {
            const list = attachmentsByExpense.get(row.expenseId) ?? [];
            list.push({ id: row.id, fileName: row.fileName, mimeType: row.mimeType, fileSize: row.fileSize });
            attachmentsByExpense.set(row.expenseId, list);
        }
    }

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
            tags: tagsByExpense.get(parsedExpense.id) ?? [],
            attachments: attachmentsByExpense.get(parsedExpense.id) ?? [],
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