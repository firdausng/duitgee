import * as v from 'valibot';

export const expenseSchema = v.object({
    id: v.string(), // cuid-like id
    note: v.optional(v.string()), // nullable in DB
    amount: v.number(), // real, required
    categoryName: v.string(), // notNull
    paymentType: v.string(), // payment method, default 'cash'
    date: v.string(), // ISO string date
    paidBy: v.optional(v.nullable(v.string())), // optional - vault-level expense
    vaultId: v.string(), // required, FK
    expenseTemplateId: v.optional(v.string()), // nullable in DB

    // Audit fields
    createdAt: v.string(),
    createdBy: v.string(), // required
    updatedAt: v.string(),
    updatedBy: v.optional(v.nullable(v.string())),
    deletedAt: v.optional(v.nullable(v.string())),
    deletedBy: v.optional(v.nullable(v.string())),
});

export type Expense = v.InferOutput<typeof expenseSchema>;

export const createExpenseSchema = v.object({
    note: v.optional(v.string()),
    amount: v.pipe(
        v.number('Amount is required'),
        v.minValue(0.01, 'Amount must be greater than 0')
    ),
    categoryName: v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Category is required')
    ),
    paymentType: v.pipe(
        v.fallback(v.string(), 'cash'),
        v.minLength(1, 'Payment type is required')
    ),
    date: v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Date is required')
    ),
    paidBy: v.optional(v.nullable(v.string())),
    vaultId: v.string(),
    templateId: v.optional(v.string()),
    // Fund integration
    fundId: v.optional(v.nullable(v.string())),
    fundPaymentMode: v.optional(v.nullable(v.picklist(['paid_by_fund', 'pending_reimbursement']))),
})

export type CreateExpense = v.InferOutput<typeof createExpenseSchema>;

export const updateExpenseSchema = v.object({
    note: v.optional(v.string()),
    amount: v.pipe(
        v.number('Amount is required'),
        v.minValue(0.01, 'Amount must be greater than 0')
    ),
    categoryName: v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Category is required')
    ),
    paymentType: v.pipe(
        v.fallback(v.string(), 'cash'),
        v.minLength(1, 'Payment type is required')
    ),
    date: v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Date is required')
    ),
    paidBy: v.optional(v.nullable(v.string())),
    templateId: v.optional(v.string()),
})

export type UpdateExpense = v.InferOutput<typeof updateExpenseSchema>;

// RPC-style query schemas (for GET requests with query params)
export const listExpensesQuerySchema = v.object({
    vaultId: v.string(),
    page: v.optional(v.pipe(v.string(), v.transform(Number)), '1'),
    limit: v.optional(v.pipe(v.string(), v.transform(Number)), '10'),
    categoryId: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    memberIds: v.optional(v.string()), // comma-separated string
    fundId: v.optional(v.string()),
});
export type ListExpensesQuery = v.InferOutput<typeof listExpensesQuerySchema>;

export const getExpenseQuerySchema = v.object({
    vaultId: v.string(),
    id: v.string(),
});
export type GetExpenseQuery = v.InferOutput<typeof getExpenseQuerySchema>;

// RPC-style command schemas (for POST requests)
export const updateExpenseRequestSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    note: v.optional(v.string()),
    amount: v.pipe(
        v.number('Amount is required'),
        v.minValue(0.01, 'Amount must be greater than 0')
    ),
    categoryName: v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Category is required')
    ),
    paymentType: v.pipe(
        v.fallback(v.string(), 'cash'),
        v.minLength(1, 'Payment type is required')
    ),
    date: v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Date is required')
    ),
    paidBy: v.optional(v.nullable(v.string())),
    // Fund integration — undefined = no change, null = remove fund tag
    fundId: v.optional(v.nullable(v.string())),
    fundPaymentMode: v.optional(v.nullable(v.picklist(['paid_by_fund', 'pending_reimbursement']))),
});
export type UpdateExpenseRequest = v.InferOutput<typeof updateExpenseRequestSchema>;

export const deleteExpenseRequestSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type DeleteExpenseRequest = v.InferOutput<typeof deleteExpenseRequestSchema>;

export const categoryGroupSchema = v.object({
    name: v.pipe(v.string(), v.minLength(1, 'Name must be 1 or more characters long.')),
    description: v.nullable(v.string()),
    color: v.pipe(v.string(), v.minLength(1, 'Color must be 1 or more characters long.'), v.regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')),
    icon: v.nullable(v.string()),
    iconType: v.nullable(v.string()),
    isPublic: v.boolean(),
});