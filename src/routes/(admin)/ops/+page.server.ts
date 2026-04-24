import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import * as authSchema from '$lib/server/db/better-auth-schema';
import { funds, fundPolicies, vaults, fundCycles, expenses } from '$lib/server/db/schema';
import { and, eq, isNull, isNotNull, count, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
    if (platform === undefined) {
        throw new Error('No platform');
    }
    const client = drizzle(platform.env.DB, { schema });
    const authClient = drizzle(platform.env.AUTH_DB, { schema: authSchema });

    const [
        [userCount],
        [anonymousCount],
        [vaultCount],
        [fundCount],
        [expenseCount],
    ] = await Promise.all([
        authClient
            .select({ n: count() })
            .from(authSchema.user)
            .where(
                or(
                    isNull(authSchema.user.isAnonymous),
                    eq(authSchema.user.isAnonymous, false),
                ),
            ),
        authClient
            .select({ n: count() })
            .from(authSchema.user)
            .where(eq(authSchema.user.isAnonymous, true)),
        client.select({ n: count() }).from(vaults).where(isNull(vaults.deletedAt)),
        client
            .select({ n: count() })
            .from(funds)
            .where(and(isNull(funds.deletedAt), eq(funds.status, 'active'))),
        client.select({ n: count() }).from(expenses).where(isNull(expenses.deletedAt)),
    ]);

    const rows = await client
        .select({
            fundId: funds.id,
            fundName: funds.name,
            vaultId: vaults.id,
            vaultName: vaults.name,
            replenishmentType: fundPolicies.replenishmentType,
            replenishmentSchedule: fundPolicies.replenishmentSchedule,
            periodEnd: fundCycles.periodEnd,
        })
        .from(funds)
        .innerJoin(vaults, eq(vaults.id, funds.vaultId))
        .innerJoin(fundPolicies, eq(fundPolicies.fundId, funds.id))
        .leftJoin(
            fundCycles,
            and(eq(fundCycles.fundId, funds.id), eq(fundCycles.status, 'active')),
        )
        .where(
            and(
                eq(funds.status, 'active'),
                isNull(funds.deletedAt),
                isNull(vaults.deletedAt),
                isNotNull(fundPolicies.replenishmentSchedule),
            ),
        )
        .orderBy(funds.name);

    return {
        fundsWithPolicy: rows,
        stats: {
            users: userCount.n,
            anonymousUsers: anonymousCount.n,
            vaults: vaultCount.n,
            funds: fundCount.n,
            expenses: expenseCount.n,
        },
    };
};
