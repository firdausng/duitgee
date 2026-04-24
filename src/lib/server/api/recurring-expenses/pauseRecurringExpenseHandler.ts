import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringExpenses } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { PauseRecurringExpenseRequest } from '$lib/schemas/recurringExpenses';

export const pauseRecurringExpense = async (
    session: App.AuthSession,
    data: PauseRecurringExpenseRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageRecurring', env);

    const [existing] = await client
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
    if (!existing) throw new Error('Recurring expense not found');
    if (existing.status === 'ended') throw new Error('Cannot pause an ended recurring expense');

    const [paused] = await client
        .update(recurringExpenses)
        .set({
            status: 'paused',
            nextOccurrenceAt: null,
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringExpenses.id, data.id))
        .returning();

    return paused;
};
