import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { attachments } from '$lib/server/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { createAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import {
    ATTACHMENT_ALLOWED_MIME_TYPES,
    ATTACHMENT_MAX_SIZE_BYTES,
} from '$lib/schemas/attachments';

export type UploadAttachmentInput = {
    vaultId: string;
    fileName: string;
    mimeType: string;
    /** Buffered file body. R2 requires a length-aware payload, so the API route
     *  reads the request body into a buffer before calling this handler. With
     *  a 10 MB hard cap on file size, the memory cost is bounded and acceptable
     *  on Workers (128 MB total). */
    body: ArrayBuffer | Uint8Array;
    /** Size in bytes — preserved separately so we don't need to compute byteLength again. */
    fileSize: number;
};

const sanitizeFileName = (raw: string): string => {
    // Strip path segments + control chars; keep extension intact.
    const noPath = raw.split(/[/\\]/).pop() ?? raw;
    return noPath.replace(/[\x00-\x1f]/g, '').slice(0, 255);
};

export const uploadAttachment = async (
    session: App.AuthSession,
    input: UploadAttachmentInput,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, input.vaultId, 'canCreateExpenses', env);

    // Validate
    if (!input.fileSize || input.fileSize <= 0) {
        throw new Error('Empty file');
    }
    if (input.fileSize > ATTACHMENT_MAX_SIZE_BYTES) {
        throw new Error(`File too large: max ${ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024)} MB`);
    }
    if (!(ATTACHMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
        throw new Error(`Unsupported file type: ${input.mimeType}`);
    }

    const fileName = sanitizeFileName(input.fileName);
    if (!fileName) throw new Error('Invalid file name');

    const attachmentId = createId();
    const r2Key = `${input.vaultId}/${attachmentId}/${fileName}`;

    // R2 needs a length-known payload. Buffered ArrayBuffer/Uint8Array works; raw
    // ReadableStreams from Hono request bodies don't (R2 throws "must have a known
    // length"). With a 10 MB max, the memory cost is bounded.
    await env.ATTACHMENTS_BUCKET.put(r2Key, input.body, {
        httpMetadata: { contentType: input.mimeType },
        customMetadata: {
            vaultId: input.vaultId,
            uploadedBy: session.user.id,
        },
    });

    const client = drizzle(env.DB, { schema });

    try {
        const [row] = await client
            .insert(attachments)
            .values({
                id: attachmentId,
                vaultId: input.vaultId,
                fileName,
                mimeType: input.mimeType,
                fileSize: input.fileSize,
                r2Key,
                ...createAuditFields({ userId: session.user.id }),
            })
            .returning();

        return {
            id: row.id,
            fileName: row.fileName,
            mimeType: row.mimeType,
            fileSize: row.fileSize,
            createdAt: row.createdAt,
        };
    } catch (err) {
        // DB insert failed after R2 put — clean up the orphan object.
        try {
            await env.ATTACHMENTS_BUCKET.delete(r2Key);
        } catch {
            // best-effort
        }
        throw err;
    }
};
