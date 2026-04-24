import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    recurringExpenses,
    expenses,
    pendingRecurringOccurrences,
} from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { deleteAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { detachFundFromExpense } from '$lib/server/api/funds/fundExpenseHelpers';
import type { DeleteRecurringExpenseRequest } from '$lib/schemas/recurringExpenses';

export const deleteRecurringExpense = async (
    session: App.AuthSession,
    data: DeleteRecurringExpenseRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageRecurring', env);

    const [existing] = await client
        .select()
        .from(recurringExpenses)
        .where(
            and(
                eq(recurringExpenses.id, data.id),
                eq(recurringExpenses.vaultId, data.vaultId),
                isNull(recurringExpenses.deletedAt),
            ),
        )
        .limit(1);
    if (!existing) throw new Error('Recurring expense not found');

    let expensesDeleted = 0;

    // Optionally cascade: soft-delete every generated expense and reverse any fund side-effects.
    if (data.deleteExpenses) {
        const generated = await client
            .select()
            .from(expenses)
            .where(
                and(
                    eq(expenses.recurringExpenseId, data.id),
                    isNull(expenses.deletedAt),
                ),
            );

        for (const exp of generated) {
            // Reverse fund transaction if the expense tapped a fund. Helper is a no-op
            // for transactions that didn't move balance (pending_reimbursement).
            if (exp.fundTransactionId) {
                try {
                    await detachFundFromExpense(
                        exp.fundTransactionId,
                        exp.fundPaymentMode,
                        userId,
                        env,
                    );
                } catch (error) {
                    console.error({
                        message: 'Failed to reverse fund transaction during rule delete',
                        expenseId: exp.id,
                        error,
                    });
                    // Continue — losing the reversal is less bad than leaving the user stuck.
                }
            }

            await client
                .update(expenses)
                .set({
                    ...deleteAuditFields({ userId }),
                    ...updateAuditFields({ userId }),
                })
                .where(eq(expenses.id, exp.id));

            expensesDeleted++;
        }
    }

    // Always sweep still-pending approvals so they don't orphan.
    await client
        .update(pendingRecurringOccurrences)
        .set({
            status: 'skipped',
            ...updateAuditFields({ userId }),
        })
        .where(
            and(
                eq(pendingRecurringOccurrences.recurringExpenseId, data.id),
                eq(pendingRecurringOccurrences.status, 'pending'),
            ),
        );

    // Finally soft-delete the rule itself.
    const [deleted] = await client
        .update(recurringExpenses)
        .set({
            status: 'ended',
            nextOccurrenceAt: null,
            ...deleteAuditFields({ userId }),
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringExpenses.id, data.id))
        .returning();

    return { ...deleted, expensesDeleted };
};
