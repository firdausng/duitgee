import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringExpenses, pendingRecurringOccurrences } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import type { CancelRecurringExpenseRequest } from '$lib/schemas/recurringExpenses';

/**
 * Terminal lifecycle action: ends a recurring rule WITHOUT booking a final
 * expense. Fills the gap between `settleRecurringExpense` (pays the remainder)
 * and `deleteRecurringExpense` (removes the rule). Works for both installments
 * (abandoned BNPL) and indefinite subscriptions (Netflix-style cancel).
 *
 * Pending queue occurrences for this rule are swept to `skipped`.
 */
export const cancelRecurringExpense = async (
    session: App.AuthSession,
    data: CancelRecurringExpenseRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageRecurring', env);

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
    if (rule.status === 'ended') throw new Error('Rule is already ended');

    // Sweep pending approvals for this rule (mirror settle's tail).
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

    // End the rule. occurrenceCount + endAfterCount are left untouched so the
    // historical plan shape stays intact for the ended-rule detail page.
    const nowIso = formatISO(new UTCDate());
    const [updated] = await client
        .update(recurringExpenses)
        .set({
            status: 'ended',
            nextOccurrenceAt: null,
            lastGeneratedAt: nowIso,
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringExpenses.id, rule.id))
        .returning();

    return updated;
};
