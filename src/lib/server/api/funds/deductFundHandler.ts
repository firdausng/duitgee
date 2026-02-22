import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundTransactions } from '$lib/server/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { getActiveCycleOrCreate } from './getActiveCycleOrCreate';
import type { DeductFund } from '$lib/schemas/funds';

export const deductFund = async (
    session: App.AuthSession,
    data: DeductFund,
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
    if (fund.status === 'archived') throw new Error('Cannot deduct from an archived fund');
    if (fund.balance < data.amount) throw new Error('Insufficient fund balance');

    // Get (or lazily create) the active cycle
    const cycle = await getActiveCycleOrCreate(fund.id, userId, env);

    // Record the deduction transaction
    const [transaction] = await client
        .insert(fundTransactions)
        .values({
            fundId: fund.id,
            cycleId: cycle.id,
            type: 'deduction',
            amount: data.amount,
            note: data.note ?? null,
            ...initialAuditFields({ userId }),
        })
        .returning();

    // Update cached balance on fund
    const [updatedFund] = await client
        .update(funds)
        .set({
            balance: sql`${funds.balance} - ${data.amount}`,
            ...updateAuditFields({ userId }),
        })
        .where(eq(funds.id, fund.id))
        .returning();

    return { fund: updatedFund, transaction };
};
