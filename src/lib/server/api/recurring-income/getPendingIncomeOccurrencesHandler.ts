import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    pendingRecurringIncomeOccurrences,
    recurringIncome,
    incomeTemplates,
} from '$lib/server/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { GetPendingIncomeOccurrencesQuery } from '$lib/schemas/recurringIncome';

export const getPendingIncomeOccurrences = async (
    session: App.AuthSession,
    query: GetPendingIncomeOccurrencesQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });
    const rows = await client
        .select({
            occ: pendingRecurringIncomeOccurrences,
            ruleName: recurringIncome.name,
            templateName: incomeTemplates.name,
            templateIcon: incomeTemplates.icon,
        })
        .from(pendingRecurringIncomeOccurrences)
        .leftJoin(recurringIncome, eq(pendingRecurringIncomeOccurrences.recurringIncomeId, recurringIncome.id))
        .leftJoin(incomeTemplates, eq(recurringIncome.templateId, incomeTemplates.id))
        .where(
            and(
                eq(pendingRecurringIncomeOccurrences.vaultId, query.vaultId),
                eq(pendingRecurringIncomeOccurrences.status, 'pending'),
            ),
        )
        .orderBy(asc(pendingRecurringIncomeOccurrences.dueDate));

    return rows.map((r) => ({
        ...r.occ,
        ruleName: r.ruleName,
        templateName: r.templateName,
        templateIcon: r.templateIcon,
    }));
};
