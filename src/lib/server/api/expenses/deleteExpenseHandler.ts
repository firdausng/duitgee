import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {DeleteExpenseRequest} from "$lib/schemas/expenses";
import {expenses} from "$lib/server/db/schema";
import {and, eq, isNull} from "drizzle-orm";
import {deleteAuditFields} from "$lib/server/utils/audit";
import {requireVaultPermission} from "$lib/server/utils/vaultPermissions";
import {detachFundFromExpense} from "$lib/server/api/funds/fundExpenseHelpers";

export const deleteExpense = async (
    session: App.AuthSession,
    data: DeleteExpenseRequest,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });
    const { id, vaultId } = data;
    const userId = session.user.id;

    await requireVaultPermission(session, vaultId, 'canDeleteExpenses', env);

    const [existing] = await client
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.vaultId, vaultId), isNull(expenses.deletedAt)))
        .limit(1);

    if (!existing) throw new Error('Expense not found');

    // If the expense was paid by fund, create an expense_reversal and restore balance.
    // If it was pending_reimbursement, no balance action is needed — the pending
    // reimbursement view filters expenses where deletedAt IS NOT NULL.
    if (existing.fundTransactionId) {
        await detachFundFromExpense(existing.fundTransactionId, existing.fundPaymentMode, userId, env);
    }

    const [deletedExpense] = await client
        .update(expenses)
        .set(deleteAuditFields({ userId }))
        .where(eq(expenses.id, id))
        .returning();

    return deletedExpense;
};
