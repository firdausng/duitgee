import { Hono } from 'hono';
import * as v from 'valibot';
import { describeRoute, resolver } from 'hono-openapi';
import { vValidator } from '@hono/valibot-validator';
import {
    uploadAttachmentQuerySchema,
    setExpenseAttachmentsRequestSchema,
    deleteAttachmentRequestSchema,
    downloadAttachmentQuerySchema,
    ATTACHMENT_MAX_SIZE_BYTES,
} from '$lib/schemas/attachments';
import { uploadAttachment } from '$lib/server/api/attachments/uploadAttachmentHandler';
import { setExpenseAttachments } from '$lib/server/api/attachments/setExpenseAttachmentsHandler';
import { deleteAttachment } from '$lib/server/api/attachments/deleteAttachmentHandler';
import { downloadAttachment } from '$lib/server/api/attachments/downloadAttachmentHandler';

const TAG = ['Attachment'];
const common = { tags: TAG };

const successResponse = {
    200: {
        description: 'Successful response',
        content: {
            'application/json': {
                schema: resolver(v.object({ success: v.boolean(), data: v.any() })),
            },
        },
    },
};

const createdResponse = {
    201: {
        description: 'Successful response',
        content: {
            'application/json': {
                schema: resolver(v.object({ success: v.boolean(), data: v.any() })),
            },
        },
    },
};

export const attachmentsApi = new Hono<App.Api>()
    /**
     * Upload — raw body (binary). Metadata comes via query string so we can
     * stream straight to R2 without buffering the whole file in worker memory.
     * Client sends:
     *   POST /api/uploadAttachment?vaultId=X&fileName=receipt.jpg&mimeType=image%2Fjpeg
     *   Content-Type: image/jpeg
     *   Content-Length: <bytes>
     *   <body: raw file bytes>
     */
    .post(
        '/uploadAttachment',
        describeRoute({
            ...common,
            description: 'Upload a single file as a vault-scoped attachment (orphaned until linked to an expense)',
            responses: createdResponse,
        }),
        vValidator('query', uploadAttachmentQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId, fileName, mimeType } = c.req.valid('query');

            // Reject without ever touching R2 if the body is missing or oversized.
            if (!c.req.raw.body) {
                return c.json({ success: false, error: 'Empty body' }, 400);
            }
            const contentLength = Number(c.req.header('content-length') ?? 0);
            if (!contentLength || contentLength <= 0) {
                return c.json({ success: false, error: 'Missing Content-Length' }, 411);
            }
            if (contentLength > ATTACHMENT_MAX_SIZE_BYTES) {
                return c.json({
                    success: false,
                    error: `File too large: max ${ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024)} MB`,
                }, 413);
            }

            try {
                // Buffer the body so R2 sees a length-known payload. arrayBuffer()
                // throws if the body has already been consumed; we haven't touched it.
                const buffer = await c.req.raw.arrayBuffer();

                // Defense-in-depth: if Content-Length lied, fall back to the actual size.
                const actualSize = buffer.byteLength;
                if (actualSize === 0) {
                    return c.json({ success: false, error: 'Empty body' }, 400);
                }
                if (actualSize > ATTACHMENT_MAX_SIZE_BYTES) {
                    return c.json({
                        success: false,
                        error: `File too large: max ${ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024)} MB`,
                    }, 413);
                }

                const data = await uploadAttachment(
                    session,
                    {
                        vaultId,
                        fileName,
                        mimeType,
                        body: buffer,
                        fileSize: actualSize,
                    },
                    c.env,
                );
                return c.json({ success: true, data }, 201);
            } catch (error) {
                console.error({ message: 'Error uploading attachment', error });
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to upload attachment',
                }, 400);
            }
        },
    )
    .post(
        '/setExpenseAttachments',
        describeRoute({
            ...common,
            description: 'Replace the full set of attachments on a single expense',
            responses: successResponse,
        }),
        vValidator('json', setExpenseAttachmentsRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await setExpenseAttachments(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                console.error({ message: 'Error setting expense attachments', error });
                const status = error instanceof Error && error.message.toLowerCase().includes('not found') ? 404 : 400;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to set expense attachments',
                }, status);
            }
        },
    )
    .post(
        '/deleteAttachment',
        describeRoute({
            ...common,
            description: 'Soft-delete an attachment, remove all expense links, and delete the R2 object',
            responses: successResponse,
        }),
        vValidator('json', deleteAttachmentRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await deleteAttachment(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                console.error({ message: 'Error deleting attachment', error });
                const status = error instanceof Error && error.message.toLowerCase().includes('not found') ? 404 : 400;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to delete attachment',
                }, status);
            }
        },
    )
    /**
     * Download — auth-gated streaming proxy in front of R2. Cheaper to ship than
     * pre-signed URLs (no Cloudflare API token needed) and reuses session middleware.
     */
    .get(
        '/downloadAttachment',
        describeRoute({
            ...common,
            description: 'Stream the file body of an attachment (auth-checked).',
            responses: {
                200: {
                    description: 'File stream',
                    content: {
                        'application/octet-stream': { schema: resolver(v.any()) },
                    },
                },
            },
        }),
        vValidator('query', downloadAttachmentQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const result = await downloadAttachment(session, query, c.env);
                if (!result) return c.json({ success: false, error: 'Attachment not found' }, 404);

                return new Response(result.body, {
                    headers: {
                        'Content-Type': result.mimeType,
                        'Content-Length': String(result.fileSize),
                        // Inline so images/PDFs render in the browser; user can still
                        // download via context menu / save-as.
                        'Content-Disposition': `inline; filename="${encodeURIComponent(result.fileName)}"`,
                        'Cache-Control': 'private, max-age=3600',
                    },
                });
            } catch (error) {
                console.error({ message: 'Error downloading attachment', error });
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to download attachment',
                }, 400);
            }
        },
    );
