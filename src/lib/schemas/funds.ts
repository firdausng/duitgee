import * as v from 'valibot';

const replenishmentTypeSchema = v.picklist(['manual', 'fixed_amount', 'top_to_ceiling']);
const replenishmentScheduleSchema = v.picklist(['monthly', 'biweekly', 'weekly']);

// ── Queries ────────────────────────────────────────────────────────────────

export const getFundsQuerySchema = v.object({
    vaultId: v.pipe(v.string(), v.minLength(1)),
});

export const getFundQuerySchema = v.object({
    vaultId: v.pipe(v.string(), v.minLength(1)),
    id: v.pipe(v.string(), v.minLength(1)),
});

export const getFundCyclesQuerySchema = v.object({
    fundId: v.pipe(v.string(), v.minLength(1)),
    vaultId: v.pipe(v.string(), v.minLength(1)),
});

export const getFundTransactionsQuerySchema = v.object({
    vaultId: v.pipe(v.string(), v.minLength(1)),
    fundId: v.pipe(v.string(), v.minLength(1)),
    page: v.optional(v.pipe(v.string(), v.transform(Number)), '1'),
    limit: v.optional(v.pipe(v.string(), v.transform(Number)), '30'),
    types: v.optional(v.string()), // comma-separated list
});

// ── Commands ───────────────────────────────────────────────────────────────

export const createFundSchema = v.object({
    vaultId: v.pipe(v.string(), v.minLength(1)),
    name: v.pipe(v.string(), v.minLength(1, 'Name is required'), v.maxLength(100)),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    iconType: v.optional(v.string()),
    // Policy fields
    replenishmentType: replenishmentTypeSchema,
    replenishmentAmount: v.optional(v.pipe(v.number(), v.minValue(0.01, 'Amount must be greater than 0'))),
    ceilingAmount: v.optional(v.pipe(v.number(), v.minValue(0.01, 'Ceiling must be greater than 0'))),
    replenishmentSchedule: v.optional(replenishmentScheduleSchema),
});
export type CreateFund = v.InferOutput<typeof createFundSchema>;

export const updateFundSchema = v.object({
    id: v.pipe(v.string(), v.minLength(1)),
    vaultId: v.pipe(v.string(), v.minLength(1)),
    name: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    iconType: v.optional(v.string()),
});
export type UpdateFund = v.InferOutput<typeof updateFundSchema>;

export const archiveFundSchema = v.object({
    id: v.pipe(v.string(), v.minLength(1)),
    vaultId: v.pipe(v.string(), v.minLength(1)),
});
export type ArchiveFund = v.InferOutput<typeof archiveFundSchema>;

export const topUpFundSchema = v.object({
    id: v.pipe(v.string(), v.minLength(1)),
    vaultId: v.pipe(v.string(), v.minLength(1)),
    amount: v.pipe(v.number(), v.minValue(0.01, 'Amount must be greater than 0')),
    note: v.optional(v.string()),
});
export type TopUpFund = v.InferOutput<typeof topUpFundSchema>;

export const deductFundSchema = v.object({
    id: v.pipe(v.string(), v.minLength(1)),
    vaultId: v.pipe(v.string(), v.minLength(1)),
    amount: v.pipe(v.number(), v.minValue(0.01, 'Amount must be greater than 0')),
    note: v.optional(v.string()),
});
export type DeductFund = v.InferOutput<typeof deductFundSchema>;

// ── Transfer ───────────────────────────────────────────────────────────────

export const transferFundsSchema = v.object({
    vaultId: v.pipe(v.string(), v.minLength(1)),
    fromFundId: v.pipe(v.string(), v.minLength(1)),
    toFundId: v.pipe(v.string(), v.minLength(1)),
    amount: v.pipe(v.number(), v.minValue(0.01, 'Amount must be greater than 0')),
    note: v.optional(v.string()),
});
export type TransferFunds = v.InferOutput<typeof transferFundsSchema>;

// ── Reimbursement queries & commands ───────────────────────────────────────

export const getPendingReimbursementsQuerySchema = v.object({
    fundId: v.pipe(v.string(), v.minLength(1)),
    vaultId: v.pipe(v.string(), v.minLength(1)),
});

export const getVaultPendingReimbursementsQuerySchema = v.object({
    vaultId: v.pipe(v.string(), v.minLength(1)),
});

export const settleReimbursementsSchema = v.object({
    fundId: v.pipe(v.string(), v.minLength(1)),
    vaultId: v.pipe(v.string(), v.minLength(1)),
    fundTransactionIds: v.pipe(
        v.array(v.pipe(v.string(), v.minLength(1))),
        v.minLength(1, 'Select at least one transaction to settle'),
    ),
});
export type SettleReimbursements = v.InferOutput<typeof settleReimbursementsSchema>;

export const settleVaultReimbursementsSchema = v.object({
    vaultId: v.pipe(v.string(), v.minLength(1)),
    fundTransactionIds: v.pipe(
        v.array(v.pipe(v.string(), v.minLength(1))),
        v.minLength(1, 'Select at least one transaction to settle'),
    ),
});
export type SettleVaultReimbursements = v.InferOutput<typeof settleVaultReimbursementsSchema>;
