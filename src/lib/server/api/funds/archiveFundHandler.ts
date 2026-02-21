import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { updateAuditFields } from '$lib/server/utils/audit';
import type { ArchiveFund } from '$lib/schemas/funds';

export const archiveFund = async (
    session: App.AuthSession,
    data: ArchiveFund,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canManageFunds', env);

    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    const [fund] = await client
        .select()
        .from(funds)
        .where(and(eq(funds.id, data.id), eq(funds.vaultId, data.vaultId), isNull(funds.deletedAt)))
        .limit(1);

    if (!fund) throw new Error('Fund not found');
    if (fund.status === 'archived') throw new Error('Fund is already archived');

    // Close the active cycle with the current balance as closing balance
    await client
        .update(fundCycles)
        .set({
            status: 'closed',
            closingBalance: fund.balance,
            ...updateAuditFields({ userId }),
        })
        .where(and(eq(fundCycles.fundId, fund.id), eq(fundCycles.status, 'active')));

    // Archive the fund (status change only — existing transactions and expenses are preserved)
    const [archived] = await client
        .update(funds)
        .set({ status: 'archived', ...updateAuditFields({ userId }) })
        .where(eq(funds.id, fund.id))
        .returning();

    return archived;
};
