import * as v from 'valibot';
import { FREE_PLAN_ID, getPlanLimit } from '$lib/configurations/plans';

// Free plan caps. Server enforces via getVaultPlanLimit(...).
export const INCOME_SOURCES_MAX_PER_VAULT_FREE = getPlanLimit(
    FREE_PLAN_ID,
    'maxIncomeSourcesPerVault',
);
export const INCOME_TEMPLATES_MAX_PER_VAULT_FREE = getPlanLimit(
    FREE_PLAN_ID,
    'maxIncomeTemplatesPerVault',
);

// ─── Breakdown lines (allowances + deductions) ────────────────────────────
//
// Shared shape — only `categoryName` requirement differs (mandatory for
// deductions because each deduction creates a linked expense row; optional
// for allowances because they stay as breakdown metadata).
//
// Stored as JSON in the text columns. Allowances bump the income amount;
// deductions auto-generate linked expense rows.

// Cross-field invariant: percent lines need a rate; fixed lines need an amount.
// The check is enforced at handler boundaries by the simple object schemas
// below; v.pipe + v.check would unionise the inferred type in ways valibot's
// type-side currently doesn't handle well. Runtime validation on submit is
// fine — handlers also defend with defaults (rate ?? 0, amount ?? 0).
export const allowanceLineSchema = v.object({
    label: v.pipe(v.string(), v.minLength(1, 'Label required')),
    mode: v.picklist(['percent', 'fixed']),
    rate: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1, 'Rate is a fraction, 0–1'))),
    amount: v.optional(v.pipe(v.number(), v.minValue(0, 'Amount must be >= 0'))),
    categoryName: v.optional(v.nullable(v.string())),
    note: v.optional(v.nullable(v.string())),
});
export type AllowanceLine = v.InferOutput<typeof allowanceLineSchema>;

export const deductionLineSchema = v.object({
    label: v.pipe(v.string(), v.minLength(1, 'Label required')),
    mode: v.picklist(['percent', 'fixed']),
    rate: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1, 'Rate is a fraction, 0–1'))),
    amount: v.optional(v.pipe(v.number(), v.minValue(0, 'Amount must be >= 0'))),
    categoryName: v.pipe(v.string(), v.minLength(1, 'Category required')),
    note: v.optional(v.nullable(v.string())),
});
export type DeductionLine = v.InferOutput<typeof deductionLineSchema>;

// Snapshotted on incomeEntries — same shape plus the resolved computedAmount.
// One schema for both since the snapshot fields are identical at this layer.
export const entryBreakdownLineSchema = v.object({
    label: v.string(),
    mode: v.picklist(['percent', 'fixed']),
    rate: v.optional(v.number()),
    amount: v.optional(v.number()),
    categoryName: v.optional(v.nullable(v.string())),
    note: v.optional(v.nullable(v.string())),
    computedAmount: v.pipe(v.number(), v.minValue(0)),
});
export type EntryBreakdownLine = v.InferOutput<typeof entryBreakdownLineSchema>;

// ─── Runtime shapes ────────────────────────────────────────────────────────

export const incomeSourceSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    name: v.string(),
    icon: v.nullable(v.string()),
    iconType: v.nullable(v.string()),
    createdAt: v.nullable(v.string()),
    createdBy: v.string(),
    updatedAt: v.nullable(v.string()),
    updatedBy: v.nullable(v.string()),
    deletedAt: v.nullable(v.string()),
    deletedBy: v.nullable(v.string()),
});
export type IncomeSource = v.InferOutput<typeof incomeSourceSchema>;

export const incomeTemplateSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    sourceId: v.string(),
    name: v.string(),
    icon: v.nullable(v.string()),
    iconType: v.nullable(v.string()),
    defaultAmount: v.nullable(v.number()),
    defaultPaidTo: v.nullable(v.string()),
    defaultFundId: v.nullable(v.string()),
    defaultNote: v.nullable(v.string()),
    defaultAllowances: v.nullable(v.array(allowanceLineSchema)),
    defaultDeductions: v.nullable(v.array(deductionLineSchema)),
    previousTemplateId: v.nullable(v.string()),
    endedAt: v.nullable(v.string()),
    usageCount: v.number(),
    lastUsedAt: v.nullable(v.string()),
    createdAt: v.nullable(v.string()),
    createdBy: v.string(),
    updatedAt: v.nullable(v.string()),
    updatedBy: v.nullable(v.string()),
    deletedAt: v.nullable(v.string()),
    deletedBy: v.nullable(v.string()),
});
export type IncomeTemplate = v.InferOutput<typeof incomeTemplateSchema>;

export const incomeEntrySchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    templateId: v.nullable(v.string()),
    sourceId: v.nullable(v.string()),
    amount: v.number(),
    baseAmount: v.nullable(v.number()),
    allowances: v.nullable(v.array(entryBreakdownLineSchema)),
    deductions: v.nullable(v.array(entryBreakdownLineSchema)),
    date: v.string(),
    paidTo: v.nullable(v.string()),
    note: v.nullable(v.string()),
    fundId: v.nullable(v.string()),
    fundTransactionId: v.nullable(v.string()),
    recurringIncomeId: v.nullable(v.string()),
    importBatchId: v.nullable(v.string()),
    createdAt: v.nullable(v.string()),
    createdBy: v.string(),
    updatedAt: v.nullable(v.string()),
    updatedBy: v.nullable(v.string()),
    deletedAt: v.nullable(v.string()),
    deletedBy: v.nullable(v.string()),
});
export type IncomeEntry = v.InferOutput<typeof incomeEntrySchema>;

// ─── Commands — sources (taxonomy) ────────────────────────────────────────

export const createIncomeSourceSchema = v.object({
    vaultId: v.string(),
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    icon: v.optional(v.nullable(v.string()), '💰'),
});
export type CreateIncomeSourceRequest = v.InferOutput<typeof createIncomeSourceSchema>;

export const updateIncomeSourceSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    name: v.optional(v.pipe(v.string(), v.minLength(1, 'Name is required'))),
    icon: v.optional(v.nullable(v.string())),
});
export type UpdateIncomeSourceRequest = v.InferOutput<typeof updateIncomeSourceSchema>;

export const deleteIncomeSourceSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type DeleteIncomeSourceRequest = v.InferOutput<typeof deleteIncomeSourceSchema>;

// ─── Commands — templates (pre-fills) ─────────────────────────────────────

export const createIncomeTemplateSchema = v.object({
    vaultId: v.string(),
    sourceId: v.pipe(v.string(), v.minLength(1, 'Source is required')),
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    icon: v.optional(v.nullable(v.string()), '💰'),
    defaultAmount: v.optional(v.nullable(v.number())),
    defaultPaidTo: v.optional(v.nullable(v.string())),
    defaultFundId: v.optional(v.nullable(v.string())),
    defaultNote: v.optional(v.nullable(v.string())),
    defaultAllowances: v.optional(v.nullable(v.array(allowanceLineSchema))),
    defaultDeductions: v.optional(v.nullable(v.array(deductionLineSchema))),
    // Optional lineage — set when this template continues a prior one (e.g.
    // salary stream after a job change).
    previousTemplateId: v.optional(v.nullable(v.string())),
});
export type CreateIncomeTemplateRequest = v.InferOutput<typeof createIncomeTemplateSchema>;

export const updateIncomeTemplateSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    sourceId: v.optional(v.pipe(v.string(), v.minLength(1, 'Source is required'))),
    name: v.optional(v.pipe(v.string(), v.minLength(1, 'Name is required'))),
    icon: v.optional(v.nullable(v.string())),
    defaultAmount: v.optional(v.nullable(v.number())),
    defaultPaidTo: v.optional(v.nullable(v.string())),
    defaultFundId: v.optional(v.nullable(v.string())),
    defaultNote: v.optional(v.nullable(v.string())),
    defaultAllowances: v.optional(v.nullable(v.array(allowanceLineSchema))),
    defaultDeductions: v.optional(v.nullable(v.array(deductionLineSchema))),
    // previousTemplateId is intentionally NOT in the update schema — use the
    // dedicated linkIncomeTemplate endpoint (cycle prevention).
});
export type UpdateIncomeTemplateRequest = v.InferOutput<typeof updateIncomeTemplateSchema>;

export const deleteIncomeTemplateSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type DeleteIncomeTemplateRequest = v.InferOutput<typeof deleteIncomeTemplateSchema>;

// Duplicate: clones a template under the same source. Fresh usage counters,
// no lineage carried over (a copy is an independent thing, not a continuation).
export const duplicateIncomeTemplateSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    // Optional new name; defaults to "${source.name} (copy)" server-side.
    name: v.optional(v.pipe(v.string(), v.minLength(1))),
});
export type DuplicateIncomeTemplateRequest = v.InferOutput<typeof duplicateIncomeTemplateSchema>;

// Replace: marks a template as ended (sets endedAt). Terminal — hides it from
// pickers but keeps the row for history and lineage queries. Use when a salary
// stream ends (job change). The follow-up new template carries previousTemplateId.
export const replaceIncomeTemplateSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type ReplaceIncomeTemplateRequest = v.InferOutput<typeof replaceIncomeTemplateSchema>;

// Link: sets/clears previousTemplateId on a template. Cycle-prevented server-side.
export const linkIncomeTemplateSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    previousTemplateId: v.nullable(v.string()),
});
export type LinkIncomeTemplateRequest = v.InferOutput<typeof linkIncomeTemplateSchema>;

// ─── Commands — entries ───────────────────────────────────────────────────

export const createIncomeEntrySchema = v.object({
    vaultId: v.string(),
    templateId: v.optional(v.nullable(v.string())),
    // sourceId is optional when templateId is provided (derived); required for
    // ad-hoc-with-source entries (no template, but tagged with a source kind).
    sourceId: v.optional(v.nullable(v.string())),
    // amount is what gets stored on the row (= total income, including any
    // allowances). When a breakdown is provided, the server can either trust
    // the client's amount or recompute as baseAmount + sum(allowances).
    amount: v.pipe(
        v.number('Amount is required'),
        v.minValue(0.01, 'Amount must be greater than 0'),
    ),
    // Optional breakdown. baseAmount + allowances + deductions are all opt-in;
    // omitting them keeps the entry as a simple total-income row.
    baseAmount: v.optional(v.nullable(v.number())),
    allowances: v.optional(v.nullable(v.array(allowanceLineSchema))),
    deductions: v.optional(v.nullable(v.array(deductionLineSchema))),
    date: v.pipe(v.string(), v.minLength(1, 'Date is required')),
    paidTo: v.optional(v.nullable(v.string())),
    note: v.optional(v.nullable(v.string())),
    fundId: v.optional(v.nullable(v.string())),
});
export type CreateIncomeEntryRequest = v.InferOutput<typeof createIncomeEntrySchema>;

// Combined create — makes both a new template AND a new entry in one batch.
// Source must already exist (sources are a small taxonomy; you pick from existing
// kinds rather than coining new ones inline).
export const createIncomeEntryWithTemplateSchema = v.object({
    vaultId: v.string(),
    // Template fields
    sourceId: v.pipe(v.string(), v.minLength(1, 'Source is required')),
    templateName: v.pipe(v.string(), v.minLength(1, 'Template name is required')),
    templateIcon: v.optional(v.nullable(v.string()), '💰'),
    // Entry fields
    amount: v.pipe(
        v.number('Amount is required'),
        v.minValue(0.01, 'Amount must be greater than 0'),
    ),
    baseAmount: v.optional(v.nullable(v.number())),
    allowances: v.optional(v.nullable(v.array(allowanceLineSchema))),
    deductions: v.optional(v.nullable(v.array(deductionLineSchema))),
    date: v.pipe(v.string(), v.minLength(1, 'Date is required')),
    paidTo: v.optional(v.nullable(v.string())),
    note: v.optional(v.nullable(v.string())),
    fundId: v.optional(v.nullable(v.string())),
});
export type CreateIncomeEntryWithTemplateRequest = v.InferOutput<typeof createIncomeEntryWithTemplateSchema>;

export const updateIncomeEntrySchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    templateId: v.optional(v.nullable(v.string())),
    sourceId: v.optional(v.nullable(v.string())),
    amount: v.optional(v.pipe(
        v.number(),
        v.minValue(0.01, 'Amount must be greater than 0'),
    )),
    baseAmount: v.optional(v.nullable(v.number())),
    allowances: v.optional(v.nullable(v.array(allowanceLineSchema))),
    deductions: v.optional(v.nullable(v.array(deductionLineSchema))),
    date: v.optional(v.string()),
    paidTo: v.optional(v.nullable(v.string())),
    note: v.optional(v.nullable(v.string())),
    fundId: v.optional(v.nullable(v.string())),
});
export type UpdateIncomeEntryRequest = v.InferOutput<typeof updateIncomeEntrySchema>;

export const deleteIncomeEntrySchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type DeleteIncomeEntryRequest = v.InferOutput<typeof deleteIncomeEntrySchema>;

// ─── Queries ──────────────────────────────────────────────────────────────

export const getIncomeSourcesQuerySchema = v.object({
    vaultId: v.string(),
});
export type GetIncomeSourcesQuery = v.InferOutput<typeof getIncomeSourcesQuerySchema>;

export const getIncomeSourceQuerySchema = v.object({
    vaultId: v.string(),
    id: v.string(),
});
export type GetIncomeSourceQuery = v.InferOutput<typeof getIncomeSourceQuerySchema>;

export const getIncomeTemplatesQuerySchema = v.object({
    vaultId: v.string(),
    sourceId: v.optional(v.string()), // Filter to templates under one source
    // 'true' (string from URL) → hide ended (endedAt IS NOT NULL) templates.
    // Used by the new-income picker so ex-employer salaries don't show up.
    activeOnly: v.optional(v.string()),
});
export type GetIncomeTemplatesQuery = v.InferOutput<typeof getIncomeTemplatesQuerySchema>;

export const getIncomeTemplateQuerySchema = v.object({
    vaultId: v.string(),
    id: v.string(),
});
export type GetIncomeTemplateQuery = v.InferOutput<typeof getIncomeTemplateQuerySchema>;

export const getIncomeEntriesQuerySchema = v.object({
    vaultId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    sourceId: v.optional(v.string()),
    templateId: v.optional(v.string()),
});
export type GetIncomeEntriesQuery = v.InferOutput<typeof getIncomeEntriesQuerySchema>;

export const getIncomeEntryQuerySchema = v.object({
    vaultId: v.string(),
    id: v.string(),
});
export type GetIncomeEntryQuery = v.InferOutput<typeof getIncomeEntryQuerySchema>;
