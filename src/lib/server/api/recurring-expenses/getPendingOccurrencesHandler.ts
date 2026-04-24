import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    pendingRecurringOccurrences,
    recurringExpenses,
    expenseTemplates,
} from '$lib/server/db/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { processDueRecurringExpenses } from './processDueRecurringExpenses';
import type { GetPendingOccurrencesQuery } from '$lib/schemas/recurringExpenses';

export const getPendingOccurrences = async (
    session: App.AuthSession,
    query: GetPendingOccurrencesQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canManageRecurring', env);
    await processDueRecurringExpenses(env, { vaultId: query.vaultId });

    const client = drizzle(env.DB, { schema });

    const rows = await client
        .select({
            occurrence: pendingRecurringOccurrences,
            ruleName: recurringExpenses.name,
            ruleEndAfterCount: recurringExpenses.endAfterCount,
            templateName: expenseTemplates.name,
            templateIcon: expenseTemplates.icon,
            templateCategory: expenseTemplates.defaultCategoryName,
        })
        .from(pendingRecurringOccurrences)
        .leftJoin(
            recurringExpenses,
            eq(pendingRecurringOccurrences.recurringExpenseId, recurringExpenses.id),
        )
        .leftJoin(expenseTemplates, eq(recurringExpenses.templateId, expenseTemplates.id))
        .where(
            and(
                eq(pendingRecurringOccurrences.vaultId, query.vaultId),
                eq(pendingRecurringOccurrences.status, 'pending'),
                // Exclude pending items whose rule was soft-deleted. The delete
                // handler sweeps these, but this is a safety net for any stragglers.
                isNull(recurringExpenses.deletedAt),
            ),
        )
        .orderBy(asc(pendingRecurringOccurrences.dueDate));

    return rows.map((r) => ({
        ...r.occurrence,
        ruleName: r.ruleName,
        ruleEndAfterCount: r.ruleEndAfterCount,
        templateName: r.templateName,
        templateIcon: r.templateIcon,
        templateCategory: r.templateCategory,
    }));
};
