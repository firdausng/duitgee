import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringIncome, incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { GetRecurringIncomeQuery } from '$lib/schemas/recurringIncome';

export const getRecurringIncome = async (
    session: App.AuthSession,
    query: GetRecurringIncomeQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });
    const [row] = await client
        .select({
            rule: recurringIncome,
            templateName: incomeTemplates.name,
            templateIcon: incomeTemplates.icon,
            templateDefaultAmount: incomeTemplates.defaultAmount,
        })
        .from(recurringIncome)
        .leftJoin(incomeTemplates, eq(recurringIncome.templateId, incomeTemplates.id))
        .where(
            and(
                eq(recurringIncome.id, query.id),
                eq(recurringIncome.vaultId, query.vaultId),
                isNull(recurringIncome.deletedAt),
            ),
        )
        .limit(1);

    if (!row) return null;
    return {
        ...row.rule,
        template: {
            name: row.templateName,
            icon: row.templateIcon,
            defaultAmount: row.templateDefaultAmount,
        },
    };
};
