import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { pendingRecurringOccurrences } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { SkipPendingOccurrenceRequest } from '$lib/schemas/recurringExpenses';

export const skipPendingOccurrence = async (
    session: App.AuthSession,
    data: SkipPendingOccurrenceRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageRecurring', env);

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

    const [updated] = await client
        .update(pendingRecurringOccurrences)
        .set({
            status: 'skipped',
            ...updateAuditFields({ userId }),
        })
        .where(eq(pendingRecurringOccurrences.id, occurrence.id))
        .returning();

    return updated;
};
