import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { attachments, expenseAttachments } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { deleteAuditFields } from '$lib/server/utils/audit';
import type { DeleteAttachmentRequest } from '$lib/schemas/attachments';

export const deleteAttachment = async (
    session: App.AuthSession,
    data: DeleteAttachmentRequest,
    env: Cloudflare.Env,
) => {
    // Anyone with edit permission can delete attachments — keeps things simple
    // and consistent with how tag deletion works.
    await requireVaultPermission(session, data.vaultId, 'canEditExpenses', env);

    const client = drizzle(env.DB, { schema });

    const [existing] = await client
        .select()
        .from(attachments)
        .where(and(
            eq(attachments.id, data.id),
            eq(attachments.vaultId, data.vaultId),
            isNull(attachments.deletedAt),
        ))
        .limit(1);

    if (!existing) {
        throw new Error('Attachment not found');
    }

    // Soft-delete the row, hard-delete the junctions, then remove the R2 object.
    // R2 delete is idempotent so doing it last is safe even if it fails.
    await client.batch([
        client
            .update(attachments)
            .set(deleteAuditFields({ userId: session.user.id }))
            .where(eq(attachments.id, data.id)),
        client
            .delete(expenseAttachments)
            .where(eq(expenseAttachments.attachmentId, data.id)),
    ]);

    try {
        await env.ATTACHMENTS_BUCKET.delete(existing.r2Key);
    } catch (err) {
        console.error({ message: 'Failed to delete R2 object', r2Key: existing.r2Key, err });
        // Don't fail the whole operation — the row is soft-deleted, the orphan
        // R2 object will be cleaned up by the daily orphan-sweep cron.
    }

    return { id: data.id };
};
