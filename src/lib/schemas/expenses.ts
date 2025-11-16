import * as v from 'valibot';
// import {createSelectSchema} from "drizzle-valibot";
// import {expenses} from "$lib/server/db/schema";

// export const expenseSchema = createSelectSchema(expenses);

export const expenseSchema = v.object({
    id: v.string(), // cuid-like id
    note: v.optional(v.string()), // nullable in DB
    amount: v.number(), // real, required
    categoryName: v.string(), // notNull
    paidBy: v.optional(v.nullable(v.string())), // optional - vault-level expense
    vaultId: v.string(), // required, FK
    date: v.string(), // ISO string date

    // Payment info
    paymentType: v.optional(v.nullable(v.string())),

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
    ...v.pick(expenseSchema, ['note', 'amount', 'categoryName', 'paidBy', 'vaultId', 'date', 'paymentType']).entries,
    templateId: v.string(),
})

export type CreateExpense = v.InferOutput<typeof createExpenseSchema>;

export const updateExpenseSchema = v.object({
    ...v.pick(createExpenseSchema, ['note', 'amount', 'categoryName', 'paidBy', 'date', 'paymentType']).entries,
    templateId: v.string(),
})

export type UpdateExpense = v.InferOutput<typeof updateExpenseSchema>;
export const categoryGroupSchema = v.object({
    name: v.pipe(v.string(), v.minLength(1, 'Name must be 1 or more characters long.')),
    description: v.nullable(v.string()),
    color: v.pipe(v.string(), v.minLength(1, 'Color must be 1 or more characters long.'), v.regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')),
    icon: v.nullable(v.string()),
    iconType: v.nullable(v.string()),
    isPublic: v.boolean(),
});