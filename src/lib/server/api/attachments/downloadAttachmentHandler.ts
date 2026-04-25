import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { attachments } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import type { DownloadAttachmentQuery } from '$lib/schemas/attachments';

/**
 * Returns enough information to stream the file back to the client. The Hono
 * route handler is responsible for actually building the Response — we don't
 * import Hono types here so this stays testable in isolation.
 */
export const downloadAttachment = async (
    session: App.AuthSession,
    query: DownloadAttachmentQuery,
    env: Cloudflare.Env,
): Promise<{
    body: ReadableStream<Uint8Array>;
    fileName: string;
    mimeType: string;
    fileSize: number;
} | null> => {
    // Any active vault member can download. Read-only access.
    const role = await getUserVaultRole(session.user.id, query.vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    const client = drizzle(env.DB, { schema });

    const [row] = await client
        .select()
        .from(attachments)
        .where(and(
            eq(attachments.id, query.id),
            eq(attachments.vaultId, query.vaultId),
            isNull(attachments.deletedAt),
        ))
        .limit(1);

    if (!row) return null;

    const obj = await env.ATTACHMENTS_BUCKET.get(row.r2Key);
    if (!obj) return null;

    return {
        body: obj.body,
        fileName: row.fileName,
        mimeType: row.mimeType,
        fileSize: row.fileSize,
    };
};
