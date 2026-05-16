import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringIncome, incomeTemplates } from '$lib/server/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { processDueRecurringIncome } from './processDueRecurringIncome';
import type { GetRecurringIncomesQuery } from '$lib/schemas/recurringIncome';

export const getRecurringIncomes = async (
    session: App.AuthSession,
    query: GetRecurringIncomesQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    // Lazy catch-up before reading so the list reflects any owed occurrences.
    try {
        await processDueRecurringIncome(env, { vaultId: query.vaultId });
    } catch (err) {
        console.error('[getRecurringIncomes] lazy catch-up failed', err);
    }

    const client = drizzle(env.DB, { schema });

    const conditions = [
        eq(recurringIncome.vaultId, query.vaultId),
        isNull(recurringIncome.deletedAt),
    ];
    if (query.status) conditions.push(eq(recurringIncome.status, query.status));

    const rows = await client
        .select({
            rule: recurringIncome,
            templateName: incomeTemplates.name,
            templateIcon: incomeTemplates.icon,
            templateDefaultAmount: incomeTemplates.defaultAmount,
        })
        .from(recurringIncome)
        .leftJoin(incomeTemplates, eq(recurringIncome.templateId, incomeTemplates.id))
        .where(and(...conditions))
        .orderBy(desc(recurringIncome.createdAt));

    return rows.map((r) => ({
        ...r.rule,
        template: {
            name: r.templateName,
            icon: r.templateIcon,
            defaultAmount: r.templateDefaultAmount,
        },
    }));
};
