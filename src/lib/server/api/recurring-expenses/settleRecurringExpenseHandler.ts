import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    recurringExpenses,
    expenseTemplates,
    expenses,
    pendingRecurringOccurrences,
    funds,
} from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { attachFundToExpense } from '$lib/server/api/funds/fundExpenseHelpers';
import { formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import type { SettleRecurringExpenseRequest } from '$lib/schemas/recurringExpenses';

/**
 * Record a full settlement for an installment: creates a single lump-sum
 * expense (linked to the rule) and marks the rule as ended. Pending approvals
 * are swept. Fund integration mirrors the engine's auto-generate path —
 * insufficient balance falls back to `pending_reimbursement`.
 */
export const settleRecurringExpense = async (
    session: App.AuthSession,
    data: SettleRecurringExpenseRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageRecurring', env);
    await requireVaultPermission(session, data.vaultId, 'canCreateExpenses', env);

    const [rule] = await client
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
    if (!rule) throw new Error('Recurring expense not found');
    if (rule.endAfterCount === null) {
        throw new Error('Only installments can be settled in full');
    }
    if (rule.status === 'ended') {
        throw new Error('Rule is already ended');
    }

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
        throw new Error('Template has no category; cannot settle');
    }

    const paidBy =
        template.defaultPaidBy === '__creator__'
            ? rule.createdBy
            : template.defaultPaidBy ?? null;
    const note = data.note ?? `Full settlement of ${rule.name ?? template.name}`;

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
                preferredMode === 'paid_by_fund' && fund.balance < data.amount
                    ? 'pending_reimbursement'
                    : preferredMode;

            fundTransactionId = await attachFundToExpense(
                expenseId,
                rule.vaultId,
                fund.id,
                resolvedFundMode,
                data.amount,
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
            amount: data.amount,
            categoryName: template.defaultCategoryName,
            paymentType: template.defaultPaymentType ?? 'cash',
            date: data.date,
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

    // Sweep pending approvals for this rule.
    await client
        .update(pendingRecurringOccurrences)
        .set({
            status: 'skipped',
            ...updateAuditFields({ userId }),
        })
        .where(
            and(
                eq(pendingRecurringOccurrences.recurringExpenseId, rule.id),
                eq(pendingRecurringOccurrences.status, 'pending'),
            ),
        );

    // End the rule. Leave occurrenceCount + endAfterCount untouched so the
    // historical plan shape is preserved. lastGeneratedAt updates to now so
    // the "last activity" timeline reflects the settlement.
    const nowIso = formatISO(new UTCDate());
    const [updatedRule] = await client
        .update(recurringExpenses)
        .set({
            status: 'ended',
            nextOccurrenceAt: null,
            lastGeneratedAt: nowIso,
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringExpenses.id, rule.id))
        .returning();

    return { expense, rule: updatedRule };
};
