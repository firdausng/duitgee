import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundPolicies, fundTransfers, fundTransactions } from '$lib/server/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { isAfter, parseISO, addDays } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { formatISO } from 'date-fns';
import { createId } from '@paralleldrive/cuid2';
import { calculateCyclePeriod } from './cyclePeriod';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';

/**
 * Returns the active cycle for a fund.
 * If the active cycle's periodEnd has passed, closes it and opens a new one.
 * Manual funds (periodEnd = 2099) are never auto-closed.
 *
 * If carryOverBalance is configured on the policy, the remaining balance is
 * transferred to the target fund before the cycle closes (new cycle opens at 0).
 *
 * @param skipCarryOver - Pass true when resolving the target fund's cycle during
 *   a carry-over transfer, to prevent A→B→A infinite loops.
 */
export const getActiveCycleOrCreate = async (
    fundId: string,
    userId: string,
    env: Cloudflare.Env,
    skipCarryOver = false,
) => {
    const client = drizzle(env.DB, { schema });
    const now = new UTCDate();

    const [activeCycle] = await client
        .select()
        .from(fundCycles)
        .where(and(eq(fundCycles.fundId, fundId), eq(fundCycles.status, 'active')))
        .limit(1);

    if (!activeCycle) {
        throw new Error('No active cycle found for fund');
    }

    const periodEndDate = parseISO(activeCycle.periodEnd);
    const isExpired = !isAfter(periodEndDate, now);

    if (!isExpired) {
        return activeCycle;
    }

    // Cycle has expired — close it and open the next one
    const [fund] = await client
        .select({ balance: funds.balance, vaultId: funds.vaultId, status: funds.status })
        .from(funds)
        .where(eq(funds.id, fundId))
        .limit(1);

    const [policy] = await client
        .select({
            replenishmentSchedule: fundPolicies.replenishmentSchedule,
            carryOverBalance: fundPolicies.carryOverBalance,
            carryOverFundId: fundPolicies.carryOverFundId,
        })
        .from(fundPolicies)
        .where(eq(fundPolicies.fundId, fundId))
        .limit(1);

    let closingBalance = fund?.balance ?? 0;

    // Execute carry-over transfer before closing the cycle
    if (
        !skipCarryOver &&
        policy?.carryOverBalance &&
        policy?.carryOverFundId &&
        closingBalance > 0
    ) {
        const [targetFund] = await client
            .select({ id: funds.id, balance: funds.balance, vaultId: funds.vaultId, status: funds.status })
            .from(funds)
            .where(and(eq(funds.id, policy.carryOverFundId), isNull(funds.deletedAt)))
            .limit(1);

        if (targetFund && targetFund.status !== 'archived') {
            // Resolve target's active cycle; pass skipCarryOver=true to prevent loops
            const targetCycle = await getActiveCycleOrCreate(targetFund.id, userId, env, true);

            const carryAmount = closingBalance;
            const transferId = createId();
            const nowStr = formatISO(new UTCDate());

            await client.batch([
                client.insert(fundTransfers).values({
                    id: transferId,
                    vaultId: targetFund.vaultId,
                    fromFundId: fundId,
                    toFundId: targetFund.id,
                    amount: carryAmount,
                    note: 'Carry-over on cycle rollover',
                    transferredBy: userId,
                    transferredAt: nowStr,
                    ...initialAuditFields({ userId }),
                }),
                client.insert(fundTransactions).values({
                    id: createId(),
                    fundId,
                    cycleId: activeCycle.id, // attributed to the closing cycle
                    type: 'transfer_out',
                    amount: carryAmount,
                    fundTransferId: transferId,
                    note: 'Carry-over on cycle rollover',
                    ...initialAuditFields({ userId }),
                }),
                client.insert(fundTransactions).values({
                    id: createId(),
                    fundId: targetFund.id,
                    cycleId: targetCycle.id,
                    type: 'transfer_in',
                    amount: carryAmount,
                    fundTransferId: transferId,
                    note: 'Carry-over from cycle rollover',
                    ...initialAuditFields({ userId }),
                }),
                // Zero out source fund balance
                client
                    .update(funds)
                    .set({ balance: 0, ...updateAuditFields({ userId }) })
                    .where(eq(funds.id, fundId)),
                // Add to target fund balance
                client
                    .update(funds)
                    .set({
                        balance: sql`${funds.balance} + ${carryAmount}`,
                        ...updateAuditFields({ userId }),
                    })
                    .where(eq(funds.id, targetFund.id)),
            ]);

            closingBalance = 0;
        }
    }

    await client
        .update(fundCycles)
        .set({ status: 'closed', closingBalance, ...updateAuditFields({ userId }) })
        .where(eq(fundCycles.id, activeCycle.id));

    // Next period starts the day after the previous one ended
    const nextPeriodFrom = addDays(periodEndDate, 1);
    const { periodStart, periodEnd } = calculateCyclePeriod(
        policy?.replenishmentSchedule,
        nextPeriodFrom,
    );

    const [newCycle] = await client
        .insert(fundCycles)
        .values({
            fundId,
            periodStart,
            periodEnd,
            openingBalance: closingBalance,
            status: 'active',
            ...initialAuditFields({ userId }),
        })
        .returning();

    return newCycle;
};
