import * as v from 'valibot';

// Server-enforced limits. Mirror gee-ledger's defaults.
export const ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ATTACHMENT_ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
] as const;
export const ATTACHMENT_MAX_PER_EXPENSE_FREE = 5;
export const ATTACHMENT_MAX_PER_EXPENSE_PRO = 20;

export const attachmentSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    r2Key: v.string(),
    // Audit fields
    createdAt: v.nullable(v.string()),
    createdBy: v.string(),
    deletedAt: v.nullable(v.string()),
    deletedBy: v.nullable(v.string()),
});
export type Attachment = v.InferOutput<typeof attachmentSchema>;

// Public-facing shape returned to clients (no R2 key — that's an internal detail)
export const attachmentPublicSchema = v.object({
    id: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    createdAt: v.nullable(v.string()),
});
export type AttachmentPublic = v.InferOutput<typeof attachmentPublicSchema>;

// Upload uses raw body + headers/query (multipart parsing on Workers Free is
// CPU-expensive on 10 MB files; raw body lets us stream straight to R2).
// vaultId, fileName, mimeType come in as query params on POST /api/uploadAttachment.
export const uploadAttachmentQuerySchema = v.object({
    vaultId: v.string(),
    fileName: v.pipe(
        v.string('fileName is required'),
        v.minLength(1, 'fileName is required'),
        v.maxLength(255, 'fileName too long'),
    ),
    mimeType: v.pipe(
        v.string('mimeType is required'),
        v.minLength(1, 'mimeType is required'),
    ),
});
export type UploadAttachmentQuery = v.InferOutput<typeof uploadAttachmentQuerySchema>;

export const setExpenseAttachmentsRequestSchema = v.object({
    vaultId: v.string(),
    expenseId: v.string(),
    attachmentIds: v.array(v.string()),
});
export type SetExpenseAttachmentsRequest = v.InferOutput<typeof setExpenseAttachmentsRequestSchema>;

export const deleteAttachmentRequestSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type DeleteAttachmentRequest = v.InferOutput<typeof deleteAttachmentRequestSchema>;

export const downloadAttachmentQuerySchema = v.object({
    vaultId: v.string(),
    id: v.string(),
});
export type DownloadAttachmentQuery = v.InferOutput<typeof downloadAttachmentQuerySchema>;
