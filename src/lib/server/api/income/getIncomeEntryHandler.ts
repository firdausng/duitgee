import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeEntries, incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { aliasedTable, and, eq, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { GetIncomeEntryQuery } from '$lib/schemas/income';

export const getIncomeEntry = async (
    session: App.AuthSession,
    query: GetIncomeEntryQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });

    const directSource = aliasedTable(incomeSources, 'direct_source');

    const [row] = await client
        .select({
            entry: incomeEntries,
            templateName: incomeTemplates.name,
            templateIcon: incomeTemplates.icon,
            sourceName: directSource.name,
            sourceIcon: directSource.icon,
        })
        .from(incomeEntries)
        .leftJoin(incomeTemplates, eq(incomeEntries.templateId, incomeTemplates.id))
        .leftJoin(directSource, eq(incomeEntries.sourceId, directSource.id))
        .where(
            and(
                eq(incomeEntries.id, query.id),
                eq(incomeEntries.vaultId, query.vaultId),
                isNull(incomeEntries.deletedAt),
            ),
        )
        .limit(1);

    if (!row) return null;
    return {
        ...row.entry,
        template: row.entry.templateId
            ? { name: row.templateName, icon: row.templateIcon }
            : null,
        source: row.entry.sourceId
            ? { name: row.sourceName, icon: row.sourceIcon }
            : null,
    };
};
