import * as v from 'valibot';

export const scheduleUnitSchema = v.picklist(['day', 'week', 'month', 'year']);
export const generationModeSchema = v.picklist(['auto', 'queue']);
export const recurringStatusSchema = v.picklist(['active', 'paused', 'ended']);
export const occurrenceStatusSchema = v.picklist(['pending', 'approved', 'skipped']);

export const recurringExpenseSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    templateId: v.string(),
    name: v.nullable(v.string()),
    amountOverride: v.nullable(v.number()),
    scheduleUnit: scheduleUnitSchema,
    scheduleInterval: v.number(),
    anchorDate: v.string(),
    generationMode: generationModeSchema,
    status: recurringStatusSchema,
    endDate: v.nullable(v.string()),
    endAfterCount: v.nullable(v.number()),
    nextOccurrenceAt: v.nullable(v.string()),
    lastGeneratedAt: v.nullable(v.string()),
    occurrenceCount: v.number(),
    createdAt: v.nullable(v.string()),
    createdBy: v.string(),
    updatedAt: v.nullable(v.string()),
    updatedBy: v.nullable(v.string()),
    deletedAt: v.nullable(v.string()),
    deletedBy: v.nullable(v.string()),
});

export type RecurringExpense = v.InferOutput<typeof recurringExpenseSchema>;

// --- Commands ---

export const createRecurringExpenseSchema = v.object({
    vaultId: v.string(),
    templateId: v.string(),
    name: v.optional(v.string()),
    amountOverride: v.optional(v.nullable(v.number())),
    scheduleUnit: scheduleUnitSchema,
    scheduleInterval: v.pipe(
        v.fallback(v.number(), 1),
        v.integer('Interval must be an integer'),
        v.minValue(1, 'Interval must be at least 1'),
    ),
    anchorDate: v.pipe(v.string(), v.minLength(1, 'Anchor date is required')),
    generationMode: generationModeSchema,
    endDate: v.optional(v.nullable(v.string())),
    endAfterCount: v.optional(v.nullable(v.pipe(
        v.number(),
        v.integer(),
        v.minValue(1, 'End after count must be at least 1'),
    ))),
});

export type CreateRecurringExpenseRequest = v.InferOutput<typeof createRecurringExpenseSchema>;

// Combined create: one form makes both a template AND a recurring rule at once.
// Used by the main /recurring/new flow so users never have to think about templates.
export const createRecurringExpenseWithTemplateSchema = v.object({
    vaultId: v.string(),
    // Template fields
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    icon: v.optional(v.nullable(v.string()), '🔁'),
    defaultAmount: v.pipe(
        v.number('Amount is required'),
        v.minValue(0.01, 'Amount must be greater than 0'),
    ),
    defaultCategoryName: v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Category is required'),
    ),
    defaultNote: v.optional(v.nullable(v.string())),
    defaultPaymentType: v.optional(v.pipe(
        v.fallback(v.string(), 'cash'),
        v.minLength(1, 'Payment type is required'),
    ), 'cash'),
    defaultPaidBy: v.optional(v.nullable(v.string())),
    defaultFundId: v.optional(v.nullable(v.string())),
    defaultFundPaymentMode: v.optional(v.nullable(v.picklist(['paid_by_fund', 'pending_reimbursement']))),
    // Rule fields
    scheduleUnit: scheduleUnitSchema,
    scheduleInterval: v.pipe(
        v.fallback(v.number(), 1),
        v.integer('Interval must be an integer'),
        v.minValue(1, 'Interval must be at least 1'),
    ),
    anchorDate: v.pipe(v.string(), v.minLength(1, 'Anchor date is required')),
    generationMode: generationModeSchema,
    endDate: v.optional(v.nullable(v.string())),
    endAfterCount: v.optional(v.nullable(v.pipe(
        v.number(),
        v.integer(),
        v.minValue(1, 'End after count must be at least 1'),
    ))),
    // Back-fill past occurrences (from anchor to now) as pending queue items.
    // Only takes effect when generationMode = 'queue'. Capped server-side at 12.
    backfill: v.optional(v.boolean(), false),
});

export type CreateRecurringExpenseWithTemplateRequest = v.InferOutput<typeof createRecurringExpenseWithTemplateSchema>;

// Combined update: edits both the rule and its backing template in one atomic batch.
// Mirrors the create schema. All fields required so callers send the full desired state.
export const updateRecurringExpenseWithTemplateSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    // Template fields
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    icon: v.optional(v.nullable(v.string()), '🔁'),
    defaultAmount: v.pipe(
        v.number('Amount is required'),
        v.minValue(0.01, 'Amount must be greater than 0'),
    ),
    defaultCategoryName: v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Category is required'),
    ),
    defaultNote: v.optional(v.nullable(v.string())),
    defaultPaymentType: v.optional(v.pipe(
        v.fallback(v.string(), 'cash'),
        v.minLength(1, 'Payment type is required'),
    ), 'cash'),
    defaultPaidBy: v.optional(v.nullable(v.string())),
    defaultFundId: v.optional(v.nullable(v.string())),
    defaultFundPaymentMode: v.optional(v.nullable(v.picklist(['paid_by_fund', 'pending_reimbursement']))),
    // Rule fields
    scheduleUnit: scheduleUnitSchema,
    scheduleInterval: v.pipe(
        v.fallback(v.number(), 1),
        v.integer('Interval must be an integer'),
        v.minValue(1, 'Interval must be at least 1'),
    ),
    anchorDate: v.pipe(v.string(), v.minLength(1, 'Anchor date is required')),
    generationMode: generationModeSchema,
    endDate: v.optional(v.nullable(v.string())),
    endAfterCount: v.optional(v.nullable(v.pipe(
        v.number(),
        v.integer(),
        v.minValue(1, 'End after count must be at least 1'),
    ))),
    // When true, propagates editable fields (amount, category, note, paymentType,
    // paidBy, fund) to every expense already generated by this rule. Fund
    // transactions are re-wired (detach+attach or delta) to keep balances honest.
    applyToPast: v.optional(v.boolean(), false),
});

export type UpdateRecurringExpenseWithTemplateRequest = v.InferOutput<typeof updateRecurringExpenseWithTemplateSchema>;

export const updateRecurringExpenseSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    name: v.optional(v.nullable(v.string())),
    amountOverride: v.optional(v.nullable(v.number())),
    scheduleUnit: v.optional(scheduleUnitSchema),
    scheduleInterval: v.optional(v.pipe(
        v.number(),
        v.integer(),
        v.minValue(1, 'Interval must be at least 1'),
    )),
    anchorDate: v.optional(v.string()),
    generationMode: v.optional(generationModeSchema),
    endDate: v.optional(v.nullable(v.string())),
    endAfterCount: v.optional(v.nullable(v.pipe(
        v.number(),
        v.integer(),
        v.minValue(1),
    ))),
});

export type UpdateRecurringExpenseRequest = v.InferOutput<typeof updateRecurringExpenseSchema>;

export const deleteRecurringExpenseSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    // When true, also soft-deletes every expense generated by this rule and
    // reverses any fund transactions. Pending approvals are always swept.
    deleteExpenses: v.optional(v.boolean(), false),
});
export type DeleteRecurringExpenseRequest = v.InferOutput<typeof deleteRecurringExpenseSchema>;

export const pauseRecurringExpenseSchema = deleteRecurringExpenseSchema;
export type PauseRecurringExpenseRequest = v.InferOutput<typeof pauseRecurringExpenseSchema>;

export const resumeRecurringExpenseSchema = deleteRecurringExpenseSchema;
export type ResumeRecurringExpenseRequest = v.InferOutput<typeof resumeRecurringExpenseSchema>;

export const skipNextOccurrenceSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type SkipNextOccurrenceRequest = v.InferOutput<typeof skipNextOccurrenceSchema>;

// Full settlement: records a single lump-sum expense and ends the installment.
export const settleRecurringExpenseSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    amount: v.pipe(
        v.number('Amount is required'),
        v.minValue(0.01, 'Amount must be greater than 0'),
    ),
    date: v.pipe(v.string(), v.minLength(1, 'Date is required')),
    note: v.optional(v.nullable(v.string())),
});
export type SettleRecurringExpenseRequest = v.InferOutput<typeof settleRecurringExpenseSchema>;

export const approvePendingOccurrenceSchema = v.object({
    vaultId: v.string(),
    occurrenceId: v.string(),
    amountOverride: v.optional(v.number()),
    noteOverride: v.optional(v.string()),
});
export type ApprovePendingOccurrenceRequest = v.InferOutput<typeof approvePendingOccurrenceSchema>;

export const skipPendingOccurrenceSchema = v.object({
    vaultId: v.string(),
    occurrenceId: v.string(),
});
export type SkipPendingOccurrenceRequest = v.InferOutput<typeof skipPendingOccurrenceSchema>;

// --- Queries ---

export const getRecurringExpensesQuerySchema = v.object({
    vaultId: v.string(),
    status: v.optional(recurringStatusSchema),
});
export type GetRecurringExpensesQuery = v.InferOutput<typeof getRecurringExpensesQuerySchema>;

export const getRecurringExpenseQuerySchema = v.object({
    vaultId: v.string(),
    id: v.string(),
});
export type GetRecurringExpenseQuery = v.InferOutput<typeof getRecurringExpenseQuerySchema>;

export const getPendingOccurrencesQuerySchema = v.object({
    vaultId: v.string(),
});
export type GetPendingOccurrencesQuery = v.InferOutput<typeof getPendingOccurrencesQuerySchema>;

export const getUpcomingOccurrencesQuerySchema = v.object({
    vaultId: v.string(),
    days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
});
export type GetUpcomingOccurrencesQuery = v.InferOutput<typeof getUpcomingOccurrencesQuerySchema>;
