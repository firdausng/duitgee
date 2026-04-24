import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringExpenses } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { deleteAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { DeleteRecurringExpenseRequest } from '$lib/schemas/recurringExpenses';

export const deleteRecurringExpense = async (
    session: App.AuthSession,
    data: DeleteRecurringExpenseRequest,
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

    const [deleted] = await client
        .update(recurringExpenses)
        .set({
            status: 'ended',
            nextOccurrenceAt: null,
            ...deleteAuditFields({ userId }),
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringExpenses.id, data.id))
        .returning();

    return deleted;
};
