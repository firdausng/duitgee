import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses } from '$lib/server/db/schema';
import { createId } from '@paralleldrive/cuid2';
import { initialAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { notifyVault } from '$lib/server/utils/notifications';
import {
    UNIDENTIFIED_CATEGORY,
    type CreateUnidentifiedExpenseRequest,
} from '$lib/schemas/unidentifiedExpenses';

export const createUnidentifiedExpense = async (
    session: App.AuthSession,
    data: CreateUnidentifiedExpenseRequest,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canCreateExpenses', env);

    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;
    const auditFields = initialAuditFields({ userId });

    const id = createId();
    const date = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
    const paidBy = data.paidBy === undefined ? userId : data.paidBy;

    await client.insert(expenses).values({
        id,
        amount: data.amount,
        categoryName: UNIDENTIFIED_CATEGORY,
        paymentType: 'other',
        date,
        paidBy,
        vaultId: data.vaultId,
        status: 'unidentified',
        ...auditFields,
    });

    // Notify other members. Best-effort; failures don't roll back the create.
    await notifyVault(env, {
        vaultId: data.vaultId,
        type: 'expense:unidentified_created',
        title: 'Unidentified charge logged',
        body: `An unidentified charge of ${data.amount} was logged. Was it you? Add details if so.`,
        linkUrl: `/vaults/${data.vaultId}/expenses/${id}/edit`,
        metadata: { expenseId: id, amount: data.amount, date },
        createdBy: userId,
        excludeUserId: userId,
    });

    return { id };
};
