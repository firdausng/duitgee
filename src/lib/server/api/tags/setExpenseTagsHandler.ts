import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import { expenses, expenseTags, expenseTagAssignments } from "$lib/server/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { requireVaultPermission } from "$lib/server/utils/vaultPermissions";
import type { SetExpenseTagsRequest } from "$lib/schemas/tags";

export const setExpenseTags = async (
    session: App.AuthSession,
    data: SetExpenseTagsRequest,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canEditExpenses', env);

    const client = drizzle(env.DB, { schema });

    // Verify expense belongs to this vault
    const expense = await client
        .select({ id: expenses.id })
        .from(expenses)
        .where(and(
            eq(expenses.id, data.expenseId),
            eq(expenses.vaultId, data.vaultId),
            isNull(expenses.deletedAt),
        ))
        .limit(1);

    if (expense.length === 0) {
        throw new Error('Expense not found');
    }

    const uniqueTagIds = Array.from(new Set(data.tagIds));

    // Verify all tag IDs belong to this vault (and are not deleted)
    if (uniqueTagIds.length > 0) {
        const validTags = await client
            .select({ id: expenseTags.id })
            .from(expenseTags)
            .where(and(
                inArray(expenseTags.id, uniqueTagIds),
                eq(expenseTags.vaultId, data.vaultId),
                isNull(expenseTags.deletedAt),
            ));

        if (validTags.length !== uniqueTagIds.length) {
            throw new Error('One or more tags do not belong to this vault');
        }
    }

    // Replace assignments atomically: delete all existing, then insert the new set.
    const userId = session.user.id;
    const deleteOp = client
        .delete(expenseTagAssignments)
        .where(eq(expenseTagAssignments.expenseId, data.expenseId));

    if (uniqueTagIds.length > 0) {
        const insertOp = client
            .insert(expenseTagAssignments)
            .values(uniqueTagIds.map((tagId) => ({
                expenseId: data.expenseId,
                tagId,
                createdBy: userId,
            })));
        await client.batch([deleteOp, insertOp]);
    } else {
        await deleteOp;
    }

    return { expenseId: data.expenseId, tagIds: uniqueTagIds };
};
