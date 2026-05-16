import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringIncome, pendingRecurringIncomeOccurrences } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { deleteAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { DeleteRecurringIncomeRequest } from '$lib/schemas/recurringIncome';

/**
 * Soft delete the rule. Generated income entries STAY (they're history),
 * unlike the expense-side cascade option. Pending approvals are swept.
 */
export const deleteRecurringIncome = async (
    session: App.AuthSession,
    data: DeleteRecurringIncomeRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [existing] = await client
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
    if (!existing) throw new Error('Recurring income not found');

    await client
        .update(pendingRecurringIncomeOccurrences)
        .set({
            status: 'skipped',
            ...updateAuditFields({ userId }),
        })
        .where(
            and(
                eq(pendingRecurringIncomeOccurrences.recurringIncomeId, existing.id),
                eq(pendingRecurringIncomeOccurrences.status, 'pending'),
            ),
        );

    await client
        .update(recurringIncome)
        .set(deleteAuditFields({ userId }))
        .where(eq(recurringIncome.id, existing.id));

    return { id: existing.id };
};
