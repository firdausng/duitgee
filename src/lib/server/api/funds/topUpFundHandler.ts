import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundTransactions } from '$lib/server/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { getActiveCycleOrCreate } from './getActiveCycleOrCreate';
import type { TopUpFund } from '$lib/schemas/funds';

export const topUpFund = async (
    session: App.AuthSession,
    data: TopUpFund,
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
    if (fund.status === 'archived') throw new Error('Cannot top up an archived fund');

    // Get (or lazily create) the active cycle
    const cycle = await getActiveCycleOrCreate(fund.id, userId, env);

    // Record the top_up transaction
    const [transaction] = await client
        .insert(fundTransactions)
        .values({
            fundId: fund.id,
            cycleId: cycle.id,
            type: 'top_up',
            amount: data.amount,
            note: data.note ?? null,
            ...initialAuditFields({ userId }),
        })
        .returning();

    // Update cached balance on fund
    const [updatedFund] = await client
        .update(funds)
        .set({
            balance: sql`${funds.balance} + ${data.amount}`,
            ...updateAuditFields({ userId }),
        })
        .where(eq(funds.id, fund.id))
        .returning();

    // Update cycle aggregates
    await client
        .update(fundCycles)
        .set({
            topUpAmount: sql`${fundCycles.topUpAmount} + ${data.amount}`,
            ...updateAuditFields({ userId }),
        })
        .where(eq(fundCycles.id, cycle.id));

    return { fund: updatedFund, transaction };
};
