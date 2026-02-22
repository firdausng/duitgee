import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundPolicies, fundTransactions } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';

export const getFund = async (
    vaultId: string,
    fundId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
) => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('Permission denied: not a member of this vault');

    const client = drizzle(env.DB, { schema });

    const [row] = await client
        .select({
            fund: funds,
            activeCycle: fundCycles,
            policy: fundPolicies,
        })
        .from(funds)
        .leftJoin(
            fundCycles,
            and(eq(fundCycles.fundId, funds.id), eq(fundCycles.status, 'active')),
        )
        .leftJoin(fundPolicies, eq(fundPolicies.fundId, funds.id))
        .where(and(eq(funds.id, fundId), eq(funds.vaultId, vaultId)))
        .limit(1);

    if (!row) return null;

    // Fetch deduction total for the active cycle
    let totalDeducted = 0;
    if (row.activeCycle?.id) {
        const [deduction] = await client
            .select({ total: sql<number>`cast(sum(${fundTransactions.amount}) as real)` })
            .from(fundTransactions)
            .where(and(
                eq(fundTransactions.cycleId, row.activeCycle.id),
                eq(fundTransactions.type, 'deduction'),
            ));
        totalDeducted = deduction?.total ?? 0;
    }

    // Resolve carry-over target fund name
    let carryOverFundName: string | null = null;
    if (row.policy?.carryOverFundId) {
        const [targetFund] = await client
            .select({ name: funds.name, icon: funds.icon })
            .from(funds)
            .where(eq(funds.id, row.policy.carryOverFundId))
            .limit(1);
        carryOverFundName = targetFund ? `${targetFund.icon ?? ''} ${targetFund.name}`.trim() : null;
    }

    return {
        ...row,
        activeCycle: row.activeCycle
            ? { ...row.activeCycle, totalDeducted }
            : null,
        carryOverFundName,
    };
};
