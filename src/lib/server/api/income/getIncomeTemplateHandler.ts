import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { GetIncomeTemplateQuery } from '$lib/schemas/income';

export const getIncomeTemplate = async (
    session: App.AuthSession,
    query: GetIncomeTemplateQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });
    const [row] = await client
        .select({
            template: incomeTemplates,
            sourceName: incomeSources.name,
            sourceIcon: incomeSources.icon,
        })
        .from(incomeTemplates)
        .leftJoin(incomeSources, eq(incomeTemplates.sourceId, incomeSources.id))
        .where(
            and(
                eq(incomeTemplates.id, query.id),
                eq(incomeTemplates.vaultId, query.vaultId),
                isNull(incomeTemplates.deletedAt),
            ),
        )
        .limit(1);

    if (!row) return null;
    return {
        ...row.template,
        source: { name: row.sourceName, icon: row.sourceIcon },
    };
};
