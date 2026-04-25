import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { attachments, expenses, expenseAttachments } from '$lib/server/db/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireAttachmentCount } from '$lib/server/utils/entitlements';
import type { SetExpenseAttachmentsRequest } from '$lib/schemas/attachments';

export const setExpenseAttachments = async (
    session: App.AuthSession,
    data: SetExpenseAttachmentsRequest,
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

    const uniqueIds = Array.from(new Set(data.attachmentIds));

    // Enforce per-plan attachment-count cap before touching anything else.
    await requireAttachmentCount(data.vaultId, uniqueIds.length, env);

    // Verify all attachment IDs belong to this vault and aren't deleted
    if (uniqueIds.length > 0) {
        const valid = await client
            .select({ id: attachments.id })
            .from(attachments)
            .where(and(
                inArray(attachments.id, uniqueIds),
                eq(attachments.vaultId, data.vaultId),
                isNull(attachments.deletedAt),
            ));

        if (valid.length !== uniqueIds.length) {
            throw new Error('One or more attachments do not belong to this vault');
        }
    }

    // Replace assignments atomically: delete all existing, then insert new set.
    const userId = session.user.id;
    const deleteOp = client
        .delete(expenseAttachments)
        .where(eq(expenseAttachments.expenseId, data.expenseId));

    if (uniqueIds.length > 0) {
        const insertOp = client
            .insert(expenseAttachments)
            .values(uniqueIds.map((attachmentId) => ({
                expenseId: data.expenseId,
                attachmentId,
                createdBy: userId,
            })));
        await client.batch([deleteOp, insertOp]);
    } else {
        await deleteOp;
    }

    return { expenseId: data.expenseId, attachmentIds: uniqueIds };
};
