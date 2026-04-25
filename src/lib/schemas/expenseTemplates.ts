import * as v from 'valibot';

// Base expense template schema
export const expenseTemplateSchema = v.object({
    id: v.string(),
    userId: v.string(),
    vaultId: v.string(),
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    description: v.nullable(v.string()),
    icon: v.nullable(v.string()),
    iconType: v.nullable(v.string()),
    defaultNote: v.nullable(v.string()),
    defaultAmount: v.nullable(v.number()),
    defaultCategoryName: v.nullable(v.string()),
    // JSON-encoded string[] in storage; null = legacy single-cat template
    categoryNames: v.nullable(v.string()),
    defaultPaymentType: v.nullable(v.string()),
    defaultPaidBy: v.nullable(v.string()),
    usageCount: v.number(),
    lastUsedAt: v.nullable(v.string()),
    createdAt: v.nullable(v.string()),
    createdBy: v.string(),
    updatedAt: v.nullable(v.string()),
    updatedBy: v.nullable(v.string()),
    deletedAt: v.nullable(v.string()),
    deletedBy: v.nullable(v.string()),
});

export type ExpenseTemplate = v.InferOutput<typeof expenseTemplateSchema>;

// Create expense template schema
export const createExpenseTemplateSchema = v.object({
    vaultId: v.string(),
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
    description: v.optional(v.nullable(v.string())),
    icon: v.optional(v.nullable(v.string()), '📝'),
    iconType: v.optional(v.nullable(v.string()), 'emoji'),
    defaultNote: v.optional(v.nullable(v.string())),
    defaultAmount: v.optional(v.nullable(v.number())),
    defaultCategoryName: v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Category is required')
    ),
    defaultPaymentType: v.optional(v.pipe(
        v.fallback(v.string(), 'cash'),
        v.minLength(1, 'Payment type is required')
    ), 'cash'),
    defaultPaidBy: v.optional(v.nullable(v.string())),
    defaultFundId: v.optional(v.nullable(v.string())),
    defaultFundPaymentMode: v.optional(v.nullable(v.string())),
    // Tags pre-applied to expenses created from this template
    defaultTagIds: v.optional(v.array(v.string())),
    // Allowed categories for this template. First entry is the default. When
    // present, defaultCategoryName is kept in sync with categoryNames[0] by the handler.
    categoryNames: v.optional(v.array(v.string())),
});

export type CreateExpenseTemplate = v.InferOutput<typeof createExpenseTemplateSchema>;

// Update expense template schema
export const updateExpenseTemplateSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    name: v.optional(v.pipe(v.string(), v.minLength(1, 'Name is required'))),
    description: v.optional(v.nullable(v.string())),
    icon: v.optional(v.nullable(v.string())),
    iconType: v.optional(v.nullable(v.string())),
    defaultNote: v.optional(v.nullable(v.string())),
    defaultAmount: v.optional(v.nullable(v.number())),
    defaultCategoryName: v.optional(v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Category is required')
    )),
    defaultPaymentType: v.optional(v.pipe(
        v.fallback(v.string(), 'cash'),
        v.minLength(1, 'Payment type is required')
    )),
    defaultPaidBy: v.optional(v.nullable(v.string())),
    defaultFundId: v.optional(v.nullable(v.string())),
    defaultFundPaymentMode: v.optional(v.nullable(v.string())),
    // Tags pre-applied to expenses created from this template (replaces full set)
    defaultTagIds: v.optional(v.array(v.string())),
    // Allowed categories. First entry is the default. Replaces full set when provided.
    categoryNames: v.optional(v.array(v.string())),
});

export type UpdateExpenseTemplate = v.InferOutput<typeof updateExpenseTemplateSchema>;

// RPC-style query schemas (for GET requests with query params)
export const listExpenseTemplatesQuerySchema = v.object({
    vaultId: v.string(),
});
export type ListExpenseTemplatesQuery = v.InferOutput<typeof listExpenseTemplatesQuerySchema>;

export const getExpenseTemplateQuerySchema = v.object({
    vaultId: v.string(),
    id: v.string(),
});
export type GetExpenseTemplateQuery = v.InferOutput<typeof getExpenseTemplateQuerySchema>;

// RPC-style command schemas (for POST requests)
export const deleteExpenseTemplateRequestSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type DeleteExpenseTemplateRequest = v.InferOutput<typeof deleteExpenseTemplateRequestSchema>;
