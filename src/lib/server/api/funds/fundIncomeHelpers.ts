import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundTransactions } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { getActiveCycleOrCreate } from './getActiveCycleOrCreate';

/**
 * Create a `top_up` fundTransactions row for an income entry that routes into
 * a fund. The fund balance and the cycle's topUpAmount aggregate are bumped.
 *
 * Mirrors `attachFundToExpense` in shape, but flows the opposite direction —
 * money INTO the fund instead of out of it. The caller stores the returned
 * transaction id on the income entry's `fundTransactionId` column.
 */
export async function attachFundToIncome(
    incomeEntryId: string,
    incomeVaultId: string,
    fundId: string,
    incomeAmount: number,
    userId: string,
    env: Cloudflare.Env,
): Promise<string> {
    const client = drizzle(env.DB, { schema });

    const [fund] = await client
        .select()
        .from(funds)
        .where(eq(funds.id, fundId))
        .limit(1);

    if (!fund) throw new Error('Fund not found');
    if (fund.vaultId !== incomeVaultId) throw new Error('Fund does not belong to this vault');
    if (fund.status === 'archived') throw new Error('Cannot route income to an archived fund');

    const cycle = await getActiveCycleOrCreate(fund.id, userId, env);
    const auditFields = initialAuditFields({ userId });

    // expenseId on fundTransactions is a soft ref. Income doesn't have a slot
    // there yet; tracking flows the other way (incomeEntries.fundTransactionId
    // points at this row). Pass null and rely on the reverse pointer.
    const [transaction] = await client
        .insert(fundTransactions)
        .values({
            fundId: fund.id,
            cycleId: cycle.id,
            type: 'top_up',
            amount: incomeAmount,
            expenseId: null,
            ...auditFields,
        })
        .returning();

    await client
        .update(funds)
        .set({
            balance: sql`${funds.balance} + ${incomeAmount}`,
            ...updateAuditFields({ userId }),
        })
        .where(eq(funds.id, fund.id));

    await client
        .update(fundCycles)
        .set({
            topUpAmount: sql`${fundCycles.topUpAmount} + ${incomeAmount}`,
            ...updateAuditFields({ userId }),
        })
        .where(eq(fundCycles.id, cycle.id));

    // Track the income entry id on the transaction for traceability.
    await client
        .update(fundTransactions)
        .set({ expenseId: incomeEntryId, ...updateAuditFields({ userId }) })
        .where(eq(fundTransactions.id, transaction.id));

    return transaction.id;
}

/**
 * Reverse a `top_up` transaction when its income entry is deleted or the
 * fund link is cleared. Subtracts from fund balance and cycle aggregate.
 *
 * Insert a corrective row (no negative-amount semantic on the schema, so
 * the audit trail uses a separate row instead of mutating the original).
 * We reuse `expense_reversal` as the corrective type since it's the
 * generic "undo a balance change" entry — pragmatic given we don't want
 * to add a `top_up_reversal` type for one caller. The original `top_up`
 * row stays intact for history.
 */
export async function detachFundFromIncome(
    fundTransactionId: string | null,
    userId: string,
    env: Cloudflare.Env,
): Promise<void> {
    if (!fundTransactionId) return;

    const client = drizzle(env.DB, { schema });

    const [original] = await client
        .select()
        .from(fundTransactions)
        .where(eq(fundTransactions.id, fundTransactionId))
        .limit(1);

    if (!original) return;
    if (original.type !== 'top_up') return;

    const cycle = await getActiveCycleOrCreate(original.fundId, userId, env);
    const auditFields = initialAuditFields({ userId });

    await client.insert(fundTransactions).values({
        fundId: original.fundId,
        cycleId: cycle.id,
        type: 'expense_reversal',
        amount: original.amount,
        expenseId: original.expenseId,
        ...auditFields,
    });

    await client
        .update(funds)
        .set({
            balance: sql`${funds.balance} - ${original.amount}`,
            ...updateAuditFields({ userId }),
        })
        .where(eq(funds.id, original.fundId));

    await client
        .update(fundCycles)
        .set({
            topUpAmount: sql`${fundCycles.topUpAmount} - ${original.amount}`,
            ...updateAuditFields({ userId }),
        })
        .where(eq(fundCycles.id, original.cycleId));
}
