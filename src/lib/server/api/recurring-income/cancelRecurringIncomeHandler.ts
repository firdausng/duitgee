import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringIncome, pendingRecurringIncomeOccurrences } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { CancelRecurringIncomeRequest } from '$lib/schemas/recurringIncome';

/**
 * Terminal: end the rule, sweep pending approvals, no entry generated.
 * Income has no "settle in full" equivalent — there's no remainder to pay out.
 */
export const cancelRecurringIncome = async (
    session: App.AuthSession,
    data: CancelRecurringIncomeRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [rule] = await client
        .select()
        .from(recurringIncome)
        .where(
            and(
                eq(recurringIncome.id, data.id),
                eq(recurringIncome.vaultId, data.vaultId),
                isNull(recurringIncome.deletedAt),
            ),
        )
        .limit(1);
    if (!rule) throw new Error('Recurring income not found');
    if (rule.status === 'ended') throw new Error('Rule is already ended');

    await client
        .update(pendingRecurringIncomeOccurrences)
        .set({
            status: 'skipped',
            ...updateAuditFields({ userId }),
        })
        .where(
            and(
                eq(pendingRecurringIncomeOccurrences.recurringIncomeId, rule.id),
                eq(pendingRecurringIncomeOccurrences.status, 'pending'),
            ),
        );

    const nowIso = formatISO(new UTCDate());
    const [updated] = await client
        .update(recurringIncome)
        .set({
            status: 'ended',
            nextOccurrenceAt: null,
            lastGeneratedAt: nowIso,
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringIncome.id, rule.id))
        .returning();

    return updated;
};
