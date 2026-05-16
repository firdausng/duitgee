import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { GetIncomeTemplatesQuery } from '$lib/schemas/income';

export const getIncomeTemplates = async (
    session: App.AuthSession,
    query: GetIncomeTemplatesQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });

    const conditions = [
        eq(incomeTemplates.vaultId, query.vaultId),
        isNull(incomeTemplates.deletedAt),
    ];
    if (query.sourceId) conditions.push(eq(incomeTemplates.sourceId, query.sourceId));

    const rows = await client
        .select({
            template: incomeTemplates,
            sourceName: incomeSources.name,
            sourceIcon: incomeSources.icon,
        })
        .from(incomeTemplates)
        .leftJoin(incomeSources, eq(incomeTemplates.sourceId, incomeSources.id))
        .where(and(...conditions))
        .orderBy(desc(incomeTemplates.usageCount), desc(incomeTemplates.updatedAt));

    return rows.map((r) => ({
        ...r.template,
        source: { name: r.sourceName, icon: r.sourceIcon },
    }));
};
