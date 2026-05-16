import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringIncome } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { PauseRecurringIncomeRequest } from '$lib/schemas/recurringIncome';

export const pauseRecurringIncome = async (
    session: App.AuthSession,
    data: PauseRecurringIncomeRequest,
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
    if (existing.status === 'ended') throw new Error('Cannot pause an ended rule');

    const [paused] = await client
        .update(recurringIncome)
        .set({
            status: 'paused',
            nextOccurrenceAt: null,
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringIncome.id, data.id))
        .returning();

    return paused;
};
