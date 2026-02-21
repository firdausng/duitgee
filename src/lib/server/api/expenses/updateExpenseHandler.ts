import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {UpdateExpenseRequest} from "$lib/schemas/expenses";
import {expenses} from "$lib/server/db/schema";
import {and, eq, isNull} from "drizzle-orm";
import {updateAuditFields} from "$lib/server/utils/audit";
import {requireVaultPermission} from "$lib/server/utils/vaultPermissions";
import {attachFundToExpense, detachFundFromExpense, applyFundAmountDelta} from "$lib/server/api/funds/fundExpenseHelpers";

export const updateExpense = async (
    session: App.AuthSession,
    data: UpdateExpenseRequest,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });
    const { id, vaultId, fundId, fundPaymentMode, ...updateFields } = data;
    const userId = session.user.id;

    await requireVaultPermission(session, vaultId, 'canEditExpenses', env);

    const [existing] = await client
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.vaultId, vaultId), isNull(expenses.deletedAt)))
        .limit(1);

    if (!existing) throw new Error('Expense not found');

    // ── Fund change detection ────────────────────────────────────────────
    // `fundId` being `undefined` means "not included in payload, no change".
    // `fundId` being `null` means "explicitly removing the fund tag".
    const fundFieldProvided = 'fundId' in data;
    const incomingFundId = fundFieldProvided ? fundId : existing.fundId;
    const incomingMode = fundFieldProvided ? fundPaymentMode : existing.fundPaymentMode;

    const isRemovingFund = fundFieldProvided && fundId === null && existing.fundId !== null;
    const isAddingFund = fundFieldProvided && fundId !== null && existing.fundId === null;
    const isSwappingFund =
        fundFieldProvided &&
        fundId !== null &&
        existing.fundId !== null &&
        (fundId !== existing.fundId || fundPaymentMode !== existing.fundPaymentMode);
    const isAmountChanged = data.amount !== existing.amount;
    const isSameFundPaidByFund =
        !isRemovingFund && !isAddingFund && !isSwappingFund &&
        existing.fundId !== null &&
        existing.fundPaymentMode === 'paid_by_fund';

    let newFundTransactionId = existing.fundTransactionId;
    let newFundId = existing.fundId;
    let newFundPaymentMode = existing.fundPaymentMode;

    if (isRemovingFund || isSwappingFund) {
        await detachFundFromExpense(existing.fundTransactionId, existing.fundPaymentMode, userId, env);
        newFundTransactionId = null;
        newFundId = null;
        newFundPaymentMode = null;
    }

    if (isAddingFund || isSwappingFund) {
        newFundTransactionId = await attachFundToExpense(
            id,
            vaultId,
            fundId!,
            fundPaymentMode!,
            data.amount,
            userId,
            env,
        );
        newFundId = fundId!;
        newFundPaymentMode = fundPaymentMode!;
    } else if (isSameFundPaidByFund && isAmountChanged) {
        // Same fund, paid_by_fund, only the amount changed — apply delta
        await applyFundAmountDelta(existing.fundTransactionId!, existing.amount, data.amount, userId, env);
    }

    const [updatedExpense] = await client
        .update(expenses)
        .set({
            ...updateFields,
            fundId: newFundId,
            fundPaymentMode: newFundPaymentMode,
            fundTransactionId: newFundTransactionId,
            ...updateAuditFields({ userId }),
        })
        .where(eq(expenses.id, id))
        .returning();

    return updatedExpense;
};
