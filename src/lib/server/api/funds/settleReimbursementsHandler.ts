import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundTransactions, expenses } from '$lib/server/db/schema';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { updateAuditFields } from '$lib/server/utils/audit';
import { getActiveCycleOrCreate } from './getActiveCycleOrCreate';
import { formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import type { SettleReimbursements } from '$lib/schemas/funds';

export const settleReimbursements = async (
    session: App.AuthSession,
    data: SettleReimbursements,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canManageFunds', env);

    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;
    const now = formatISO(new UTCDate());

    const [fund] = await client
        .select()
        .from(funds)
        .where(and(eq(funds.id, data.fundId), eq(funds.vaultId, data.vaultId), isNull(funds.deletedAt)))
        .limit(1);

    if (!fund) throw new Error('Fund not found');

    const rows = await client
        .select({ transaction: fundTransactions, expense: expenses })
        .from(fundTransactions)
        .innerJoin(expenses, eq(fundTransactions.expenseId, expenses.id))
        .where(
            and(
                inArray(fundTransactions.id, data.fundTransactionIds),
                eq(fundTransactions.fundId, data.fundId),
                eq(fundTransactions.type, 'pending_reimbursement'),
                isNull(expenses.deletedAt),
            ),
        );

    if (rows.length !== data.fundTransactionIds.length) {
        throw new Error(
            'Some transactions were not found, are not pending reimbursements, or belong to deleted expenses',
        );
    }

    const totalSettlement = rows.reduce((sum, r) => sum + r.expense.amount, 0);

    // Pre-validate balance before writing anything
    if (fund.balance < totalSettlement) {
        throw new Error(
            `Insufficient fund balance. Available: ${fund.balance}, required: ${totalSettlement}`,
        );
    }

    // Resolve active cycle outside batch (may involve a write for lazy rollover)
    const cycle = await getActiveCycleOrCreate(fund.id, userId, env);

    // D1 does not support transactions — use batch() which is atomic
    const transactionUpdates = rows.map(({ transaction, expense }) =>
        client
            .update(fundTransactions)
            .set({
                type: 'reimbursement',
                amount: expense.amount,
                reimbursedAt: now,
                reimbursedBy: userId,
                ...updateAuditFields({ userId }),
            })
            .where(eq(fundTransactions.id, transaction.id)),
    );

    const fundUpdate = client
        .update(funds)
        .set({
            balance: sql`${funds.balance} - ${totalSettlement}`,
            ...updateAuditFields({ userId }),
        })
        .where(eq(funds.id, fund.id));

    const cycleUpdate = client
        .update(fundCycles)
        .set({
            totalReimbursed: sql`${fundCycles.totalReimbursed} + ${totalSettlement}`,
            ...updateAuditFields({ userId }),
        })
        .where(eq(fundCycles.id, cycle.id));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.batch([...transactionUpdates, fundUpdate, cycleUpdate] as any);

    return {
        settled: rows.length,
        totalAmount: totalSettlement,
        remainingBalance: fund.balance - totalSettlement,
    };
};
