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
    // previousTemplateId is intentionally NOT in the update schema — use the
    // dedicated linkIncomeTemplate endpoint (cycle prevention).
});
export type UpdateIncomeTemplateRequest = v.InferOutput<typeof updateIncomeTemplateSchema>;

export const deleteIncomeTemplateSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type DeleteIncomeTemplateRequest = v.InferOutput<typeof deleteIncomeTemplateSchema>;

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
    amount: v.pipe(
        v.number('Amount is required'),
        v.minValue(0.01, 'Amount must be greater than 0'),
    ),
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
