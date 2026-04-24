import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundPolicies, fundTransactions } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';

export interface AutoReplenishmentResult {
    applied: boolean;
    reason?: 'manual' | 'missing_amount' | 'at_or_above_ceiling' | 'non_positive_amount';
    amount?: number;
    transactionId?: string;
}

/**
 * Apply the fund's auto-replenishment policy to the given cycle.
 * - 'fixed_amount' → insert a top_up of replenishmentAmount
 * - 'top_to_ceiling' → insert a top_up that brings fund.balance up to ceilingAmount
 * - 'manual' → no-op
 *
 * Caller is responsible for entitlement checks.
 */
export const applyAutoReplenishment = async (
    fundId: string,
    cycleId: string,
    userId: string,
    env: Cloudflare.Env,
): Promise<AutoReplenishmentResult> => {
    const client = drizzle(env.DB, { schema });

    const [policy] = await client
        .select({
            replenishmentType: fundPolicies.replenishmentType,
            replenishmentAmount: fundPolicies.replenishmentAmount,
            ceilingAmount: fundPolicies.ceilingAmount,
        })
        .from(fundPolicies)
        .where(eq(fundPolicies.fundId, fundId))
        .limit(1);

    if (!policy || policy.replenishmentType === 'manual') {
        return { applied: false, reason: 'manual' };
    }

    const [fund] = await client
        .select({ balance: funds.balance })
        .from(funds)
        .where(eq(funds.id, fundId))
        .limit(1);

    const currentBalance = fund?.balance ?? 0;

    let amount = 0;
    if (policy.replenishmentType === 'fixed_amount') {
        if (policy.replenishmentAmount == null) {
            return { applied: false, reason: 'missing_amount' };
        }
        amount = policy.replenishmentAmount;
    } else if (policy.replenishmentType === 'top_to_ceiling') {
        if (policy.ceilingAmount == null) {
            return { applied: false, reason: 'missing_amount' };
        }
        amount = policy.ceilingAmount - currentBalance;
        if (amount <= 0) {
            return { applied: false, reason: 'at_or_above_ceiling' };
        }
    }

    if (amount <= 0) {
        return { applied: false, reason: 'non_positive_amount' };
    }

    const [transaction] = await client
        .insert(fundTransactions)
        .values({
            fundId,
            cycleId,
            type: 'top_up',
            amount,
            note: `Auto-replenishment (${policy.replenishmentType})`,
            ...initialAuditFields({ userId }),
        })
        .returning();

    await client.batch([
        client
            .update(funds)
            .set({
                balance: sql`${funds.balance} + ${amount}`,
                ...updateAuditFields({ userId }),
            })
            .where(eq(funds.id, fundId)),
        client
            .update(fundCycles)
            .set({
                topUpAmount: sql`${fundCycles.topUpAmount} + ${amount}`,
                ...updateAuditFields({ userId }),
            })
            .where(eq(fundCycles.id, cycleId)),
    ]);

    return { applied: true, amount, transactionId: transaction.id };
};
