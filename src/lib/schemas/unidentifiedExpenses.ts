import * as v from 'valibot';

export const UNIDENTIFIED_CATEGORY = 'Unidentified';
/** Window (in days) for matching a new expense against existing unidentified ones. */
export const DUPLICATE_MATCH_WINDOW_DAYS = 1;

export const createUnidentifiedExpenseSchema = v.object({
    vaultId: v.string(),
    amount: v.pipe(
        v.number('Amount is required'),
        v.minValue(0.01, 'Amount must be greater than 0'),
    ),
    /** ISO 8601 with Z suffix. Defaults to "now" if omitted. */
    date: v.optional(v.string()),
    /** Optional — defaults to current user. Pass null to log as a vault-level expense. */
    paidBy: v.optional(v.nullable(v.string())),
});
export type CreateUnidentifiedExpenseRequest = v.InferOutput<typeof createUnidentifiedExpenseSchema>;

export const findUnidentifiedDuplicatesQuerySchema = v.object({
    vaultId: v.string(),
    /** Sent as string from query params — coerced to number. */
    amount: v.pipe(v.string(), v.transform(Number)),
    /** ISO date the user has typed into their new-expense form. */
    date: v.string(),
});
export type FindUnidentifiedDuplicatesQuery = v.InferOutput<typeof findUnidentifiedDuplicatesQuerySchema>;

export const claimUnidentifiedExpenseSchema = v.object({
    /** ID of the existing unidentified expense to claim. */
    id: v.string(),
    vaultId: v.string(),
    note: v.optional(v.string()),
    amount: v.pipe(
        v.number('Amount is required'),
        v.minValue(0.01, 'Amount must be greater than 0'),
    ),
    categoryName: v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Category is required'),
    ),
    paymentType: v.pipe(
        v.fallback(v.string(), 'cash'),
        v.minLength(1, 'Payment type is required'),
    ),
    date: v.pipe(
        v.fallback(v.string(), ''),
        v.minLength(1, 'Date is required'),
    ),
    paidBy: v.optional(v.nullable(v.string())),
    fundId: v.optional(v.nullable(v.string())),
    fundPaymentMode: v.optional(v.nullable(v.picklist(['paid_by_fund', 'pending_reimbursement']))),
    tagIds: v.optional(v.array(v.string())),
    attachmentIds: v.optional(v.array(v.string())),
});
export type ClaimUnidentifiedExpenseRequest = v.InferOutput<typeof claimUnidentifiedExpenseSchema>;

export interface UnidentifiedDuplicateMatch {
    id: string;
    amount: number;
    date: string;
    paidBy: string | null;
    paidByName: string | null;
    createdAt: string;
    createdBy: string;
}
