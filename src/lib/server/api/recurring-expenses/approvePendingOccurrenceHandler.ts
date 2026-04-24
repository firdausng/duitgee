import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    pendingRecurringOccurrences,
    recurringExpenses,
    expenseTemplates,
    expenses,
    funds,
} from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { attachFundToExpense } from '$lib/server/api/funds/fundExpenseHelpers';
import type { ApprovePendingOccurrenceRequest } from '$lib/schemas/recurringExpenses';

/**
 * Approve a pending recurring occurrence — converts it into a real expense row.
 * The user may override amount and note at approval time.
 */
export const approvePendingOccurrence = async (
    session: App.AuthSession,
    data: ApprovePendingOccurrenceRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageRecurring', env);
    await requireVaultPermission(session, data.vaultId, 'canCreateExpenses', env);

    const [occurrence] = await client
        .select()
        .from(pendingRecurringOccurrences)
        .where(
            and(
                eq(pendingRecurringOccurrences.id, data.occurrenceId),
                eq(pendingRecurringOccurrences.vaultId, data.vaultId),
            ),
        )
        .limit(1);
    if (!occurrence) throw new Error('Pending occurrence not found');
    if (occurrence.status !== 'pending') {
        throw new Error(`Occurrence already ${occurrence.status}`);
    }

    const [rule] = await client
        .select()
        .from(recurringExpenses)
        .where(eq(recurringExpenses.id, occurrence.recurringExpenseId))
        .limit(1);
    if (!rule) throw new Error('Recurring rule not found');

    const [template] = await client
        .select()
        .from(expenseTemplates)
        .where(
            and(
                eq(expenseTemplates.id, rule.templateId),
                isNull(expenseTemplates.deletedAt),
            ),
        )
        .limit(1);
    if (!template) throw new Error('Template not found for this rule');
    if (!template.defaultCategoryName) {
        throw new Error('Template has no category; cannot approve');
    }

    const amount = data.amountOverride ?? occurrence.suggestedAmount;
    if (amount <= 0) throw new Error('Amount must be greater than 0');

    const paidBy =
        template.defaultPaidBy === '__creator__'
            ? userId
            : template.defaultPaidBy ?? null;
    const note = data.noteOverride ?? rule.name ?? template.defaultNote ?? template.name;

    const expenseId = createId();
    let fundTransactionId: string | null = null;
    let resolvedFundMode: 'paid_by_fund' | 'pending_reimbursement' | null = null;

    if (template.defaultFundId) {
        const [fund] = await client
            .select()
            .from(funds)
            .where(eq(funds.id, template.defaultFundId))
            .limit(1);

        if (fund && fund.status === 'active' && fund.vaultId === rule.vaultId) {
            const preferredMode =
                (template.defaultFundPaymentMode as
                    | 'paid_by_fund'
                    | 'pending_reimbursement'
                    | null) ?? 'paid_by_fund';
            resolvedFundMode =
                preferredMode === 'paid_by_fund' && fund.balance < amount
                    ? 'pending_reimbursement'
                    : preferredMode;

            fundTransactionId = await attachFundToExpense(
                expenseId,
                rule.vaultId,
                fund.id,
                resolvedFundMode,
                amount,
                userId,
                env,
            );
        }
    }

    const [expense] = await client
        .insert(expenses)
        .values({
            id: expenseId,
            note,
            amount,
            categoryName: template.defaultCategoryName,
            paymentType: template.defaultPaymentType ?? 'cash',
            date: occurrence.dueDate,
            paidBy,
            vaultId: rule.vaultId,
            expenseTemplateId: rule.templateId,
            recurringExpenseId: rule.id,
            fundId: resolvedFundMode ? template.defaultFundId : null,
            fundPaymentMode: resolvedFundMode,
            fundTransactionId,
            ...initialAuditFields({ userId }),
        })
        .returning();

    await client
        .update(pendingRecurringOccurrences)
        .set({
            status: 'approved',
            approvedExpenseId: expense.id,
            ...updateAuditFields({ userId }),
        })
        .where(eq(pendingRecurringOccurrences.id, occurrence.id));

    return expense;
};
