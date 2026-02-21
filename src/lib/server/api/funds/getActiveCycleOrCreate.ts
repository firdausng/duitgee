import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundPolicies } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { isAfter, parseISO, addDays } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { calculateCyclePeriod } from './cyclePeriod';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';

/**
 * Returns the active cycle for a fund.
 * If the active cycle's periodEnd has passed, closes it and opens a new one.
 * Manual funds (periodEnd = 2099) are never auto-closed.
 */
export const getActiveCycleOrCreate = async (
    fundId: string,
    userId: string,
    env: Cloudflare.Env,
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
        .select({ balance: funds.balance })
        .from(funds)
        .where(eq(funds.id, fundId))
        .limit(1);

    const [policy] = await client
        .select({ replenishmentSchedule: fundPolicies.replenishmentSchedule })
        .from(fundPolicies)
        .where(eq(fundPolicies.fundId, fundId))
        .limit(1);

    const closingBalance = fund?.balance ?? 0;

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
