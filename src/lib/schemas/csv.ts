import * as v from 'valibot';

// Hard cap on how many rows we'll process in a single import — keeps us under
// the Worker CPU budget. Files above this are rejected with guidance to split.
export const MAX_IMPORT_ROWS = 10_000;

// Batch size for `client.batch([...])` calls during confirm. Each expense insert
// binds ~14 params; D1's hard cap is ~100 params per statement, but a *batch*
// can contain many statements. 50 rows × ~3 statements (expense + tag links +
// audit) per row keeps each batch comfortably small.
export const IMPORT_BATCH_SIZE = 50;

// Query schema for the export endpoint. Mirrors listExpensesQuerySchema's filters
// but drops pagination — exports are unpaginated by intent.
export const exportExpensesQuerySchema = v.object({
    vaultId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    categoryName: v.optional(v.string()),
    memberIds: v.optional(v.string()), // comma-separated
    fundId: v.optional(v.string()),
});
export type ExportExpensesQuery = v.InferOutput<typeof exportExpensesQuerySchema>;

// One parsed-and-normalized row, post-validation. Returned by preview, echoed
// to confirm. `lineNumber` is 1-indexed (matches what users see in spreadsheets).
export const normalizedImportRowSchema = v.object({
    lineNumber: v.number(),
    date: v.string(),                // ISO 8601 with Z suffix
    amount: v.number(),
    categoryName: v.string(),
    paymentType: v.string(),
    note: v.optional(v.string()),
    paidBy: v.nullable(v.string()),  // resolved userId, or null for vault-level
    tagNames: v.array(v.string()),   // resolved tag names (kept as names; auto-created on confirm)
});
export type NormalizedImportRow = v.InferOutput<typeof normalizedImportRowSchema>;

// One row that failed parse/validation — surfaced in the preview UI so users
// can fix the source CSV.
export const importRowErrorSchema = v.object({
    lineNumber: v.number(),
    field: v.string(),               // 'amount', 'date', 'paidByEmail', ...
    value: v.string(),
    error: v.string(),
});
export type ImportRowError = v.InferOutput<typeof importRowErrorSchema>;

// Response payload from the preview endpoint.
export const previewImportResponseSchema = v.object({
    importToken: v.string(),                // cuid; idempotency key for confirm
    totalRows: v.number(),
    validRows: v.array(normalizedImportRowSchema),
    errors: v.array(importRowErrorSchema),
    newTagNames: v.array(v.string()),       // tags that don't exist yet; will be created on confirm
});
export type PreviewImportResponse = v.InferOutput<typeof previewImportResponseSchema>;

// Confirm payload — the client echoes back the preview's normalized rows.
export const confirmImportPayloadSchema = v.object({
    vaultId: v.string(),
    importToken: v.pipe(v.string(), v.minLength(1, 'Import token is required')),
    skipInvalid: v.optional(v.boolean(), false),
    rows: v.pipe(
        v.array(normalizedImportRowSchema),
        v.minLength(1, 'At least one row is required'),
        v.maxLength(MAX_IMPORT_ROWS, `Maximum ${MAX_IMPORT_ROWS} rows per import`),
    ),
});
export type ConfirmImportPayload = v.InferOutput<typeof confirmImportPayloadSchema>;

// Response payload from confirm.
export const confirmImportResponseSchema = v.object({
    success: v.boolean(),
    importedCount: v.number(),
    importBatchId: v.string(),
    failedAtRow: v.optional(v.number()),
    error: v.optional(v.string()),
});
export type ConfirmImportResponse = v.InferOutput<typeof confirmImportResponseSchema>;
