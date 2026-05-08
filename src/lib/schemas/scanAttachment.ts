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

// Multi-expense scan: same input shape, but the response is an array of
// candidates extracted from a single screenshot (e.g. itemized receipt,
// SMS/notification screenshot listing multiple charges, group expense list).
export const scanAttachmentMultiRequestSchema = scanAttachmentRequestSchema;
export type ScanAttachmentMultiRequest = v.InferOutput<typeof scanAttachmentMultiRequestSchema>;

export const scanAttachmentMultiItemSchema = v.object({
    amount: v.nullable(v.number()),
    currency: v.nullable(v.string()),
    /** Per-item line description — e.g. "Latte", "Sandwich". May echo merchant for non-itemized inputs. */
    note: v.nullable(v.string()),
    /** Local datetime YYYY-MM-DDTHH:mm or null. Often inherited from the screenshot's overall date. */
    datetime: v.nullable(v.string()),
    /** Lean Core category — falls back to "Misc". */
    suggestedCategory: v.string(),
    confidence: v.picklist(['high', 'medium', 'low']),
});
export type ScanAttachmentMultiItem = v.InferOutput<typeof scanAttachmentMultiItemSchema>;

export const scanAttachmentMultiResponseSchema = v.object({
    items: v.array(scanAttachmentMultiItemSchema),
    /** Screenshot-level merchant hint (single bill with line items). null otherwise. */
    sourceMerchant: v.nullable(v.string()),
    /** Screenshot-level date hint, YYYY-MM-DDTHH:mm or null. */
    sourceDate: v.nullable(v.string()),
    /** Non-fatal warnings, e.g. "currency_mismatch", "truncated_to_20", "parse_failed". */
    warnings: v.array(v.string()),
});
export type ScanAttachmentMultiResponse = v.InferOutput<typeof scanAttachmentMultiResponseSchema>;

// Internal — what the AI is asked to return for the multi-mode prompt.
export const aiMultiOutputSchema = v.object({
    sourceMerchant: v.nullable(v.string()),
    sourceDate: v.nullable(v.string()),
    sourceTime: v.nullable(v.string()),
    items: v.array(
        v.object({
            amount: v.nullable(v.number()),
            currency: v.nullable(v.string()),
            note: v.nullable(v.string()),
            date: v.nullable(v.string()),
            time: v.nullable(v.string()),
            category: v.string(),
            confidence: v.picklist(['high', 'medium', 'low']),
        }),
    ),
});
export type AiMultiOutput = v.InferOutput<typeof aiMultiOutputSchema>;
