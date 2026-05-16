import * as v from 'valibot';
import { FREE_PLAN_ID, getPlanLimit } from '$lib/configurations/plans';

// Free plan cap on income sources per vault. Pro is unlimited. Server enforces
// via getVaultPlanLimit(..., 'maxIncomeSourcesPerVault').
export const INCOME_SOURCES_MAX_PER_VAULT_FREE = getPlanLimit(
    FREE_PLAN_ID,
    'maxIncomeSourcesPerVault',
);

// ─── Runtime shapes ────────────────────────────────────────────────────────

export const incomeSourceSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    name: v.string(),
    icon: v.nullable(v.string()),
    iconType: v.nullable(v.string()),
    defaultAmount: v.nullable(v.number()),
    defaultPaidTo: v.nullable(v.string()),
    defaultFundId: v.nullable(v.string()),
    defaultNote: v.nullable(v.string()),
    usageCount: v.number(),
    lastUsedAt: v.nullable(v.string()),
    createdAt: v.nullable(v.string()),
    createdBy: v.string(),
    updatedAt: v.nullable(v.string()),
    updatedBy: v.nullable(v.string()),
    deletedAt: v.nullable(v.string()),
    deletedBy: v.nullable(v.string()),
});
export type IncomeSource = v.InferOutput<typeof incomeSourceSchema>;

export const incomeEntrySchema = v.object({
    id: v.string(),
    vaultId: v.string(),
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

// ─── Commands — sources ───────────────────────────────────────────────────

export const createIncomeSourceSchema = v.object({
    vaultId: v.string(),
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    icon: v.optional(v.nullable(v.string()), '💰'),
    defaultAmount: v.optional(v.nullable(v.number())),
    defaultPaidTo: v.optional(v.nullable(v.string())),
    defaultFundId: v.optional(v.nullable(v.string())),
    defaultNote: v.optional(v.nullable(v.string())),
});
export type CreateIncomeSourceRequest = v.InferOutput<typeof createIncomeSourceSchema>;

export const updateIncomeSourceSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    name: v.optional(v.pipe(v.string(), v.minLength(1, 'Name is required'))),
    icon: v.optional(v.nullable(v.string())),
    defaultAmount: v.optional(v.nullable(v.number())),
    defaultPaidTo: v.optional(v.nullable(v.string())),
    defaultFundId: v.optional(v.nullable(v.string())),
    defaultNote: v.optional(v.nullable(v.string())),
});
export type UpdateIncomeSourceRequest = v.InferOutput<typeof updateIncomeSourceSchema>;

export const deleteIncomeSourceSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type DeleteIncomeSourceRequest = v.InferOutput<typeof deleteIncomeSourceSchema>;

// ─── Commands — entries ───────────────────────────────────────────────────

export const createIncomeEntrySchema = v.object({
    vaultId: v.string(),
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

// Combined create — makes both a new source AND a new entry in one batch.
// Used by the new-entry form when the user picks "+ New source" inline.
export const createIncomeEntryWithSourceSchema = v.object({
    vaultId: v.string(),
    // Source fields
    sourceName: v.pipe(v.string(), v.minLength(1, 'Source name is required')),
    sourceIcon: v.optional(v.nullable(v.string()), '💰'),
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
export type CreateIncomeEntryWithSourceRequest = v.InferOutput<typeof createIncomeEntryWithSourceSchema>;

export const updateIncomeEntrySchema = v.object({
    id: v.string(),
    vaultId: v.string(),
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

export const getIncomeEntriesQuerySchema = v.object({
    vaultId: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    sourceId: v.optional(v.string()),
});
export type GetIncomeEntriesQuery = v.InferOutput<typeof getIncomeEntriesQuerySchema>;

export const getIncomeEntryQuerySchema = v.object({
    vaultId: v.string(),
    id: v.string(),
});
export type GetIncomeEntryQuery = v.InferOutput<typeof getIncomeEntryQuerySchema>;
