import * as v from 'valibot';

// Budget period types
export const budgetPeriodSchema = v.picklist(['weekly', 'monthly', 'custom']);
export type BudgetPeriod = v.InferOutput<typeof budgetPeriodSchema>;

// Base budget schema (matches database schema)
export const budgetSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    name: v.string(),
    description: v.nullable(v.string()),
    amount: v.number(),
    period: budgetPeriodSchema,
    startDate: v.string(),
    endDate: v.nullable(v.string()),
    categoryName: v.nullable(v.string()),
    templateId: v.nullable(v.string()),
    userId: v.nullable(v.string()),
    alertThreshold: v.number(),
    alertEnabled: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.string(),
    createdBy: v.string(),
    updatedAt: v.string(),
    updatedBy: v.nullable(v.string()),
    deletedAt: v.nullable(v.string()),
    deletedBy: v.nullable(v.string()),
});

export type Budget = v.InferOutput<typeof budgetSchema>;

// Create budget request schema
export const createBudgetSchema = v.object({
    vaultId: v.string(),
    name: v.pipe(
        v.string(),
        v.minLength(1, 'Budget name is required'),
        v.maxLength(100, 'Budget name must be less than 100 characters')
    ),
    description: v.optional(v.string()),
    amount: v.pipe(
        v.number(),
        v.minValue(0.01, 'Budget amount must be greater than 0')
    ),
    period: budgetPeriodSchema,
    startDate: v.pipe(
        v.string(),
        v.minLength(1, 'Start date is required')
    ),
    endDate: v.optional(v.string()), // Required for 'custom' period
    // Scope filters (all optional - null means "all")
    categoryName: v.optional(v.string()),
    templateId: v.optional(v.string()),
    userId: v.optional(v.string()),
    // Alert settings
    alertThreshold: v.optional(
        v.pipe(
            v.number(),
            v.minValue(1, 'Alert threshold must be at least 1%'),
            v.maxValue(100, 'Alert threshold cannot exceed 100%')
        ),
        80 // Default to 80%
    ),
    alertEnabled: v.optional(v.boolean(), true),
});

export type CreateBudgetRequest = v.InferOutput<typeof createBudgetSchema>;

// Update budget request schema
export const updateBudgetSchema = v.object({
    id: v.string(),
    vaultId: v.string(), // Required for permission check
    name: v.optional(v.pipe(
        v.string(),
        v.minLength(1, 'Budget name is required'),
        v.maxLength(100, 'Budget name must be less than 100 characters')
    )),
    description: v.optional(v.nullable(v.string())),
    amount: v.optional(v.pipe(
        v.number(),
        v.minValue(0.01, 'Budget amount must be greater than 0')
    )),
    period: v.optional(budgetPeriodSchema),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.nullable(v.string())),
    categoryName: v.optional(v.nullable(v.string())),
    templateId: v.optional(v.nullable(v.string())),
    userId: v.optional(v.nullable(v.string())),
    alertThreshold: v.optional(v.pipe(
        v.number(),
        v.minValue(1),
        v.maxValue(100)
    )),
    alertEnabled: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
});

export type UpdateBudgetRequest = v.InferOutput<typeof updateBudgetSchema>;

// Delete budget request schema
export const deleteBudgetSchema = v.object({
    id: v.string(),
    vaultId: v.string(), // Required for permission check
});

export type DeleteBudgetRequest = v.InferOutput<typeof deleteBudgetSchema>;

// Get budgets query schema
export const getBudgetsQuerySchema = v.object({
    vaultId: v.string(),
    isActive: v.optional(v.pipe(v.string(), v.transform((val) => val === 'true'))), // Convert string to boolean
    categoryName: v.optional(v.string()),
    userId: v.optional(v.string()),
});

export type GetBudgetsQuery = v.InferOutput<typeof getBudgetsQuerySchema>;

// Get single budget query schema
export const getBudgetQuerySchema = v.object({
    id: v.string(),
    vaultId: v.string(), // Required for permission check
});

export type GetBudgetQuery = v.InferOutput<typeof getBudgetQuerySchema>;

// Budget with spending data (for responses)
export const budgetWithSpendingSchema = v.object({
    ...budgetSchema.entries,
    // Calculated spending data
    spent: v.number(), // Total spent in current period
    remaining: v.number(), // Budget - spent
    percentageUsed: v.number(), // (spent / budget) * 100
    daysInPeriod: v.number(), // Total days in period
    daysElapsed: v.number(), // Days elapsed so far
    daysRemaining: v.number(), // Days remaining in period
    dailyPace: v.number(), // Budget / daysInPeriod
    actualDailyAverage: v.number(), // Spent / daysElapsed
    projectedSpending: v.number(), // actualDailyAverage * daysInPeriod
    isOverBudget: v.boolean(), // spent > amount
    isOverPace: v.boolean(), // actualDailyAverage > dailyPace
    status: v.picklist(['on_track', 'warning', 'over_budget']),
});

export type BudgetWithSpending = v.InferOutput<typeof budgetWithSpendingSchema>;
