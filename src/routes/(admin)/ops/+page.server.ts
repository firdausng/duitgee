import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import * as authSchema from '$lib/server/db/better-auth-schema';
import {
    funds,
    fundPolicies,
    vaults,
    fundCycles,
    expenses,
    recurringExpenses,
    expenseTemplates,
} from '$lib/server/db/schema';
import { and, eq, isNull, isNotNull, count, or, gte, ne, asc } from 'drizzle-orm';
import { subDays } from 'date-fns';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
    if (platform === undefined) {
        throw new Error('No platform');
    }
    const client = drizzle(platform.env.DB, { schema });
    const authClient = drizzle(platform.env.AUTH_DB, { schema: authSchema });

    const sevenDaysAgo = subDays(new Date(), 7);

    const [
        [userCount],
        [anonymousCount],
        [recentSignupCount],
        [vaultCount],
        [proVaultCount],
        [fundCount],
        [expenseCount],
        [recurringCount],
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
        authClient
            .select({ n: count() })
            .from(authSchema.user)
            .where(gte(authSchema.user.createdAt, sevenDaysAgo)),
        client.select({ n: count() }).from(vaults).where(isNull(vaults.deletedAt)),
        client
            .select({ n: count() })
            .from(vaults)
            .where(and(isNull(vaults.deletedAt), ne(vaults.planId, 'plan_free'))),
        client
            .select({ n: count() })
            .from(funds)
            .where(and(isNull(funds.deletedAt), eq(funds.status, 'active'))),
        client.select({ n: count() }).from(expenses).where(isNull(expenses.deletedAt)),
        client
            .select({ n: count() })
            .from(recurringExpenses)
            .where(
                and(
                    isNull(recurringExpenses.deletedAt),
                    eq(recurringExpenses.status, 'active'),
                ),
            ),
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

    const recurringRules = await client
        .select({
            ruleId: recurringExpenses.id,
            ruleName: recurringExpenses.name,
            vaultId: recurringExpenses.vaultId,
            vaultName: vaults.name,
            templateName: expenseTemplates.name,
            scheduleUnit: recurringExpenses.scheduleUnit,
            scheduleInterval: recurringExpenses.scheduleInterval,
            generationMode: recurringExpenses.generationMode,
            nextOccurrenceAt: recurringExpenses.nextOccurrenceAt,
        })
        .from(recurringExpenses)
        .innerJoin(vaults, eq(vaults.id, recurringExpenses.vaultId))
        .leftJoin(expenseTemplates, eq(expenseTemplates.id, recurringExpenses.templateId))
        .where(
            and(
                eq(recurringExpenses.status, 'active'),
                isNull(recurringExpenses.deletedAt),
                isNull(vaults.deletedAt),
            ),
        )
        .orderBy(asc(recurringExpenses.nextOccurrenceAt));

    return {
        fundsWithPolicy: rows,
        recurringRules,
        stats: {
            users: userCount.n,
            anonymousUsers: anonymousCount.n,
            recentSignups: recentSignupCount.n,
            vaults: vaultCount.n,
            proVaults: proVaultCount.n,
            funds: fundCount.n,
            expenses: expenseCount.n,
            recurring: recurringCount.n,
        },
    };
};
