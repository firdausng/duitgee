import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {UpdateExpenseRequest} from "$lib/schemas/expenses";
import {expenses, expenseTagAssignments, expenseTags} from "$lib/server/db/schema";
import {and, eq, inArray, isNull} from "drizzle-orm";
import {updateAuditFields} from "$lib/server/utils/audit";
import {requireVaultPermission} from "$lib/server/utils/vaultPermissions";
import {attachFundToExpense, detachFundFromExpense, applyFundAmountDelta} from "$lib/server/api/funds/fundExpenseHelpers";

export const updateExpense = async (
    session: App.AuthSession,
    data: UpdateExpenseRequest,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });
    const { id, vaultId, fundId, fundPaymentMode, tagIds, ...updateFields } = data;
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

    // Replace tag assignments if tagIds was provided. Undefined = no change.
    if (tagIds !== undefined) {
        const uniqueTagIds = Array.from(new Set(tagIds));

        // Validate all tags belong to this vault before mutating
        if (uniqueTagIds.length > 0) {
            const validTags = await client
                .select({ id: expenseTags.id })
                .from(expenseTags)
                .where(and(
                    inArray(expenseTags.id, uniqueTagIds),
                    eq(expenseTags.vaultId, vaultId),
                    isNull(expenseTags.deletedAt),
                ));

            if (validTags.length !== uniqueTagIds.length) {
                throw new Error('One or more tags do not belong to this vault');
            }
        }

        await client
            .delete(expenseTagAssignments)
            .where(eq(expenseTagAssignments.expenseId, id));

        if (uniqueTagIds.length > 0) {
            await client
                .insert(expenseTagAssignments)
                .values(uniqueTagIds.map((tagId) => ({
                    expenseId: id,
                    tagId,
                    createdBy: userId,
                })));
        }
    }

    return updatedExpense;
};
