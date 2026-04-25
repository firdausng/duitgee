import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses, expenseTagAssignments, expenseTags, attachments, expenseAttachments } from '$lib/server/db/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { categoryData } from '$lib/configurations/categories';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireAttachmentCount } from '$lib/server/utils/entitlements';
import { notifyUser } from '$lib/server/utils/notifications';
import type { ClaimUnidentifiedExpenseRequest } from '$lib/schemas/unidentifiedExpenses';

/**
 * Convert an unidentified expense into a confirmed one by filling in the missing
 * details. Updates the row in place (preserves id, createdAt, createdBy) and
 * notifies the original creator if it wasn't this user.
 */
export const claimUnidentifiedExpense = async (
    session: App.AuthSession,
    data: ClaimUnidentifiedExpenseRequest,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canEditExpenses', env);

    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    const [existing] = await client
        .select()
        .from(expenses)
        .where(
            and(
                eq(expenses.id, data.id),
                eq(expenses.vaultId, data.vaultId),
                isNull(expenses.deletedAt),
            ),
        )
        .limit(1);

    if (!existing) throw new Error('Expense not found');
    if (existing.status !== 'unidentified') {
        throw new Error('This expense is already confirmed');
    }

    // Resolve canonical category casing if it matches a known one; fall through
    // to free-form (matches createExpense behavior).
    const categoryName =
        categoryData.categories.find(
            (c) => c.name.toLowerCase() === data.categoryName.toLowerCase(),
        )?.name ?? data.categoryName;

    // Validate tag/attachment scoping if provided.
    const tagIds = data.tagIds ? Array.from(new Set(data.tagIds)) : null;
    if (tagIds && tagIds.length > 0) {
        const validTags = await client
            .select({ id: expenseTags.id })
            .from(expenseTags)
            .where(
                and(
                    inArray(expenseTags.id, tagIds),
                    eq(expenseTags.vaultId, data.vaultId),
                    isNull(expenseTags.deletedAt),
                ),
            );
        if (validTags.length !== tagIds.length) {
            throw new Error('One or more tags do not belong to this vault');
        }
    }

    const attachmentIds = data.attachmentIds ? Array.from(new Set(data.attachmentIds)) : null;
    if (attachmentIds && attachmentIds.length > 0) {
        await requireAttachmentCount(data.vaultId, attachmentIds.length, env);
        const validAttachments = await client
            .select({ id: attachments.id })
            .from(attachments)
            .where(
                and(
                    inArray(attachments.id, attachmentIds),
                    eq(attachments.vaultId, data.vaultId),
                    isNull(attachments.deletedAt),
                ),
            );
        if (validAttachments.length !== attachmentIds.length) {
            throw new Error('One or more attachments do not belong to this vault');
        }
    }

    // Update the expense row in place.
    await client
        .update(expenses)
        .set({
            note: data.note ?? null,
            amount: data.amount,
            categoryName,
            paymentType: data.paymentType,
            date: new Date(data.date).toISOString(),
            paidBy: data.paidBy ?? null,
            fundId: data.fundId ?? null,
            fundPaymentMode: data.fundPaymentMode ?? null,
            status: 'confirmed',
            ...updateAuditFields({ userId }),
        })
        .where(eq(expenses.id, data.id));

    // Replace tag assignments if provided.
    if (tagIds !== null) {
        await client.delete(expenseTagAssignments).where(eq(expenseTagAssignments.expenseId, data.id));
        if (tagIds.length > 0) {
            await client.insert(expenseTagAssignments).values(
                tagIds.map((tagId) => ({
                    expenseId: data.id,
                    tagId,
                    createdBy: userId,
                })),
            );
        }
    }

    // Replace attachment links if provided.
    if (attachmentIds !== null) {
        await client.delete(expenseAttachments).where(eq(expenseAttachments.expenseId, data.id));
        if (attachmentIds.length > 0) {
            await client.insert(expenseAttachments).values(
                attachmentIds.map((attachmentId) => ({
                    expenseId: data.id,
                    attachmentId,
                    createdBy: userId,
                })),
            );
        }
    }

    // Notify the original creator if it wasn't this user.
    if (existing.createdBy !== userId) {
        await notifyUser(env, {
            vaultId: data.vaultId,
            userId: existing.createdBy,
            type: 'expense:unidentified_claimed',
            title: 'Your unidentified charge was claimed',
            body: `${data.amount} from ${data.date.slice(0, 10)} is now categorised as ${categoryName}.`,
            linkUrl: `/vaults/${data.vaultId}/expenses/${data.id}/edit`,
            metadata: { expenseId: data.id, claimedBy: userId },
            createdBy: userId,
        });
    }

    return { id: data.id };
};
