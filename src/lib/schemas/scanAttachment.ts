import * as v from 'valibot';

export const scanAttachmentRequestSchema = v.object({
    vaultId: v.pipe(v.string(), v.minLength(1, 'Vault ID is required')),
    attachmentId: v.pipe(v.string(), v.minLength(1, 'Attachment ID is required')),
});
export type ScanAttachmentRequest = v.InferOutput<typeof scanAttachmentRequestSchema>;

// Shape returned to clients after a successful scan. Each field can be null if
// the model couldn't read it from the receipt — caller decides how to merge.
export const scanAttachmentResponseSchema = v.object({
    amount: v.nullable(v.number()),
    currency: v.nullable(v.string()),
    /** Merchant or vendor name, e.g. "Starbucks Coffee". */
    merchant: v.nullable(v.string()),
    /** Local datetime in `YYYY-MM-DDTHH:mm` format, ready to drop into a datetime-local input. */
    datetime: v.nullable(v.string()),
    /** Lean Core category name. Always set — falls back to "Misc" when no match. */
    suggestedCategory: v.string(),
    /** Model's self-reported confidence in the extraction. */
    confidence: v.picklist(['high', 'medium', 'low']),
});
export type ScanAttachmentResponse = v.InferOutput<typeof scanAttachmentResponseSchema>;

// Internal shape — what the AI is asked to return. Validated server-side before
// being normalized into ScanAttachmentResponse.
export const aiOutputSchema = v.object({
    amount: v.nullable(v.number()),
    currency: v.nullable(v.string()),
    merchant: v.nullable(v.string()),
    date: v.nullable(v.string()),
    time: v.nullable(v.string()),
    category: v.string(),
    confidence: v.picklist(['high', 'medium', 'low']),
});
export type AiOutput = v.InferOutput<typeof aiOutputSchema>;
