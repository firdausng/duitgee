import * as v from 'valibot';

export const incomeScheduleUnitSchema = v.picklist(['day', 'week', 'month', 'year']);
export const incomeGenerationModeSchema = v.picklist(['auto', 'queue']);
export const recurringIncomeStatusSchema = v.picklist(['active', 'paused', 'ended']);
export const pendingIncomeOccurrenceStatusSchema = v.picklist(['pending', 'approved', 'skipped']);

// ─── Runtime shape ────────────────────────────────────────────────────────

export const recurringIncomeSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    templateId: v.string(),
    name: v.nullable(v.string()),
    amountOverride: v.nullable(v.number()),
    scheduleUnit: incomeScheduleUnitSchema,
    scheduleInterval: v.number(),
    anchorDate: v.string(),
    generationMode: incomeGenerationModeSchema,
    status: recurringIncomeStatusSchema,
    endDate: v.nullable(v.string()),
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
export type RecurringIncome = v.InferOutput<typeof recurringIncomeSchema>;

// ─── Commands ─────────────────────────────────────────────────────────────

export const createRecurringIncomeSchema = v.object({
    vaultId: v.string(),
    templateId: v.pipe(v.string(), v.minLength(1, 'Template is required')),
    name: v.optional(v.nullable(v.string())),
    amountOverride: v.optional(v.nullable(v.number())),
    scheduleUnit: incomeScheduleUnitSchema,
    scheduleInterval: v.pipe(
        v.fallback(v.number(), 1),
        v.integer('Interval must be an integer'),
        v.minValue(1, 'Interval must be at least 1'),
    ),
    anchorDate: v.pipe(v.string(), v.minLength(1, 'Anchor date is required')),
    generationMode: incomeGenerationModeSchema,
    endDate: v.optional(v.nullable(v.string())),
    // When true AND anchor is in the past, the engine materializes missed
    // occurrences from anchor to now. Auto mode → real income entries (with
    // breakdown + linked deduction expenses). Queue mode → pending approvals.
    // Hard-capped by the engine's MAX_CATCHUP_PER_RULE (50).
    backfill: v.optional(v.boolean(), false),
});
export type CreateRecurringIncomeRequest = v.InferOutput<typeof createRecurringIncomeSchema>;

export const updateRecurringIncomeSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    name: v.optional(v.nullable(v.string())),
    amountOverride: v.optional(v.nullable(v.number())),
    scheduleUnit: v.optional(incomeScheduleUnitSchema),
    scheduleInterval: v.optional(
        v.pipe(v.number(), v.integer(), v.minValue(1, 'Interval must be at least 1')),
    ),
    anchorDate: v.optional(v.string()),
    generationMode: v.optional(incomeGenerationModeSchema),
    endDate: v.optional(v.nullable(v.string())),
});
export type UpdateRecurringIncomeRequest = v.InferOutput<typeof updateRecurringIncomeSchema>;

export const deleteRecurringIncomeSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type DeleteRecurringIncomeRequest = v.InferOutput<typeof deleteRecurringIncomeSchema>;

export const pauseRecurringIncomeSchema = deleteRecurringIncomeSchema;
export type PauseRecurringIncomeRequest = v.InferOutput<typeof pauseRecurringIncomeSchema>;

export const resumeRecurringIncomeSchema = deleteRecurringIncomeSchema;
export type ResumeRecurringIncomeRequest = v.InferOutput<typeof resumeRecurringIncomeSchema>;

export const skipNextIncomeOccurrenceSchema = deleteRecurringIncomeSchema;
export type SkipNextIncomeOccurrenceRequest = v.InferOutput<typeof skipNextIncomeOccurrenceSchema>;

// Terminal — like the recurring-expenses cancel, but without the
// generates-final-expense branch (income has no remainder to settle).
export const cancelRecurringIncomeSchema = deleteRecurringIncomeSchema;
export type CancelRecurringIncomeRequest = v.InferOutput<typeof cancelRecurringIncomeSchema>;

export const approvePendingIncomeOccurrenceSchema = v.object({
    vaultId: v.string(),
    occurrenceId: v.string(),
    amountOverride: v.optional(v.number()),
    noteOverride: v.optional(v.string()),
    /** ISO datetime override at approval time. Propagates to both the income
     *  entry and any linked deduction-expense rows so the snapshot stays in sync. */
    dateOverride: v.optional(v.string()),
});
export type ApprovePendingIncomeOccurrenceRequest = v.InferOutput<typeof approvePendingIncomeOccurrenceSchema>;

export const skipPendingIncomeOccurrenceSchema = v.object({
    vaultId: v.string(),
    occurrenceId: v.string(),
});
export type SkipPendingIncomeOccurrenceRequest = v.InferOutput<typeof skipPendingIncomeOccurrenceSchema>;

// ─── Queries ──────────────────────────────────────────────────────────────

export const getRecurringIncomesQuerySchema = v.object({
    vaultId: v.string(),
    status: v.optional(recurringIncomeStatusSchema),
});
export type GetRecurringIncomesQuery = v.InferOutput<typeof getRecurringIncomesQuerySchema>;

export const getRecurringIncomeQuerySchema = v.object({
    vaultId: v.string(),
    id: v.string(),
});
export type GetRecurringIncomeQuery = v.InferOutput<typeof getRecurringIncomeQuerySchema>;

export const getPendingIncomeOccurrencesQuerySchema = v.object({
    vaultId: v.string(),
});
export type GetPendingIncomeOccurrencesQuery = v.InferOutput<typeof getPendingIncomeOccurrencesQuerySchema>;

export const getUpcomingIncomeOccurrencesQuerySchema = v.object({
    vaultId: v.string(),
    days: v.optional(v.pipe(v.string(), v.transform(Number)), '7'),
});
export type GetUpcomingIncomeOccurrencesQuery = v.InferOutput<typeof getUpcomingIncomeOccurrencesQuerySchema>;
