import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { pendingRecurringIncomeOccurrences } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { SkipPendingIncomeOccurrenceRequest } from '$lib/schemas/recurringIncome';

export const skipPendingIncomeOccurrence = async (
    session: App.AuthSession,
    data: SkipPendingIncomeOccurrenceRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [pending] = await client
        .select()
        .from(pendingRecurringIncomeOccurrences)
        .where(
            and(
                eq(pendingRecurringIncomeOccurrences.id, data.occurrenceId),
                eq(pendingRecurringIncomeOccurrences.vaultId, data.vaultId),
                eq(pendingRecurringIncomeOccurrences.status, 'pending'),
            ),
        )
        .limit(1);
    if (!pending) throw new Error('Pending occurrence not found or already resolved');

    const [updated] = await client
        .update(pendingRecurringIncomeOccurrences)
        .set({
            status: 'skipped',
            ...updateAuditFields({ userId }),
        })
        .where(eq(pendingRecurringIncomeOccurrences.id, data.occurrenceId))
        .returning();

    return updated;
};
