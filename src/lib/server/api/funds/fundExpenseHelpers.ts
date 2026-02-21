import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundTransactions } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { getActiveCycleOrCreate } from './getActiveCycleOrCreate';

/**
 * Create a fund transaction and wire it to an expense.
 *
 * For `paid_by_fund`:
 *   - Checks fund has sufficient balance
 *   - Creates `expense_paid` transaction
 *   - Deducts from fund balance cache
 *   - Increments cycle totalSpent
 *
 * For `pending_reimbursement`:
 *   - Creates `pending_reimbursement` placeholder (amount = 0)
 *   - No balance change
 *
 * Returns the created transaction id.
 * The caller is responsible for storing this id on the expense record.
 */
export async function attachFundToExpense(
    expenseId: string,
    expenseVaultId: string,
    fundId: string,
    fundPaymentMode: 'paid_by_fund' | 'pending_reimbursement',
    expenseAmount: number,
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
    if (fund.vaultId !== expenseVaultId) throw new Error('Fund does not belong to this vault');
    if (fund.status === 'archived') throw new Error('Cannot tag an expense to an archived fund');

    const cycle = await getActiveCycleOrCreate(fund.id, userId, env);
    const auditFields = initialAuditFields({ userId });

    if (fundPaymentMode === 'paid_by_fund') {
        if (fund.balance < expenseAmount) {
            throw new Error(`Insufficient fund balance. Available: ${fund.balance}, required: ${expenseAmount}`);
        }

        const [transaction] = await client
            .insert(fundTransactions)
            .values({
                fundId: fund.id,
                cycleId: cycle.id,
                type: 'expense_paid',
                amount: expenseAmount,
                expenseId,
                ...auditFields,
            })
            .returning();

        await client
            .update(funds)
            .set({ balance: sql`${funds.balance} - ${expenseAmount}`, ...updateAuditFields({ userId }) })
            .where(eq(funds.id, fund.id));

        await client
            .update(fundCycles)
            .set({ totalSpent: sql`${fundCycles.totalSpent} + ${expenseAmount}`, ...updateAuditFields({ userId }) })
            .where(eq(fundCycles.id, cycle.id));

        return transaction.id;
    }

    // pending_reimbursement: placeholder only, no balance change
    const [transaction] = await client
        .insert(fundTransactions)
        .values({
            fundId: fund.id,
            cycleId: cycle.id,
            type: 'pending_reimbursement',
            amount: 0,
            expenseId,
            ...auditFields,
        })
        .returning();

    return transaction.id;
}

/**
 * Reverse an existing fund transaction when an expense is removed from a fund
 * or the fund tag is changed.
 *
 * For `expense_paid`: creates an `expense_reversal`, restores fund balance.
 * For `pending_reimbursement`: no balance action needed (amount was 0).
 */
export async function detachFundFromExpense(
    fundTransactionId: string | null,
    currentPaymentMode: string | null,
    userId: string,
    env: Cloudflare.Env,
): Promise<void> {
    if (!fundTransactionId || currentPaymentMode !== 'paid_by_fund') return;

    const client = drizzle(env.DB, { schema });

    const [original] = await client
        .select()
        .from(fundTransactions)
        .where(eq(fundTransactions.id, fundTransactionId))
        .limit(1);

    if (!original) return;

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
        .set({ balance: sql`${funds.balance} + ${original.amount}`, ...updateAuditFields({ userId }) })
        .where(eq(funds.id, original.fundId));

    await client
        .update(fundCycles)
        .set({ totalSpent: sql`${fundCycles.totalSpent} - ${original.amount}`, ...updateAuditFields({ userId }) })
        .where(eq(fundCycles.id, cycle.id));
}

/**
 * Apply an amount delta to a `paid_by_fund` expense.
 * Creates a new `expense_paid` (increase) or `expense_reversal` (decrease) for the difference.
 */
export async function applyFundAmountDelta(
    fundTransactionId: string,
    oldAmount: number,
    newAmount: number,
    userId: string,
    env: Cloudflare.Env,
): Promise<void> {
    const delta = newAmount - oldAmount;
    if (delta === 0) return;

    const client = drizzle(env.DB, { schema });

    const [original] = await client
        .select()
        .from(fundTransactions)
        .where(eq(fundTransactions.id, fundTransactionId))
        .limit(1);

    if (!original) return;

    const [fund] = await client
        .select({ balance: funds.balance })
        .from(funds)
        .where(eq(funds.id, original.fundId))
        .limit(1);

    const cycle = await getActiveCycleOrCreate(original.fundId, userId, env);
    const auditFields = initialAuditFields({ userId });
    const absDelta = Math.abs(delta);

    if (delta > 0) {
        // Expense amount increased — deduct more from fund
        if ((fund?.balance ?? 0) < absDelta) {
            throw new Error(`Insufficient fund balance for the amount increase. Available: ${fund?.balance ?? 0}, required: ${absDelta}`);
        }

        await client.insert(fundTransactions).values({
            fundId: original.fundId,
            cycleId: cycle.id,
            type: 'expense_paid',
            amount: absDelta,
            expenseId: original.expenseId,
            ...auditFields,
        });

        await client
            .update(funds)
            .set({ balance: sql`${funds.balance} - ${absDelta}`, ...updateAuditFields({ userId }) })
            .where(eq(funds.id, original.fundId));

        await client
            .update(fundCycles)
            .set({ totalSpent: sql`${fundCycles.totalSpent} + ${absDelta}`, ...updateAuditFields({ userId }) })
            .where(eq(fundCycles.id, cycle.id));
    } else {
        // Expense amount decreased — restore partial balance
        await client.insert(fundTransactions).values({
            fundId: original.fundId,
            cycleId: cycle.id,
            type: 'expense_reversal',
            amount: absDelta,
            expenseId: original.expenseId,
            ...auditFields,
        });

        await client
            .update(funds)
            .set({ balance: sql`${funds.balance} + ${absDelta}`, ...updateAuditFields({ userId }) })
            .where(eq(funds.id, original.fundId));

        await client
            .update(fundCycles)
            .set({ totalSpent: sql`${fundCycles.totalSpent} - ${absDelta}`, ...updateAuditFields({ userId }) })
            .where(eq(fundCycles.id, cycle.id));
    }
}
