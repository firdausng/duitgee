import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeEntries } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { deleteAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { detachFundFromIncome } from '$lib/server/api/funds/fundIncomeHelpers';
import type { DeleteIncomeEntryRequest } from '$lib/schemas/income';

export const deleteIncomeEntry = async (
    session: App.AuthSession,
    data: DeleteIncomeEntryRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [existing] = await client
        .select()
        .from(incomeEntries)
        .where(
            and(
                eq(incomeEntries.id, data.id),
                eq(incomeEntries.vaultId, data.vaultId),
                isNull(incomeEntries.deletedAt),
            ),
        )
        .limit(1);
    if (!existing) throw new Error('Income entry not found');

    // Reverse any fund top-up before the soft delete so balances stay honest.
    await detachFundFromIncome(existing.fundTransactionId, userId, env);

    await client
        .update(incomeEntries)
        .set(deleteAuditFields({ userId }))
        .where(eq(incomeEntries.id, existing.id));

    return { id: existing.id };
};
