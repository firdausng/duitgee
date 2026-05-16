import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeEntries, incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { aliasedTable, and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { GetIncomeEntriesQuery } from '$lib/schemas/income';

export const getIncomeEntries = async (
    session: App.AuthSession,
    query: GetIncomeEntriesQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });

    // Alias the source table so the template's source-name doesn't collide with
    // the entry's direct source-name in the SELECT.
    const directSource = aliasedTable(incomeSources, 'direct_source');

    const conditions = [
        eq(incomeEntries.vaultId, query.vaultId),
        isNull(incomeEntries.deletedAt),
    ];
    if (query.startDate) conditions.push(gte(incomeEntries.date, query.startDate));
    if (query.endDate) conditions.push(lte(incomeEntries.date, query.endDate));
    if (query.sourceId) conditions.push(eq(incomeEntries.sourceId, query.sourceId));
    if (query.templateId) conditions.push(eq(incomeEntries.templateId, query.templateId));

    const rows = await client
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
        .where(and(...conditions))
        .orderBy(desc(incomeEntries.date), desc(incomeEntries.createdAt));

    return rows.map((r) => ({
        ...r.entry,
        template: r.entry.templateId
            ? { name: r.templateName, icon: r.templateIcon }
            : null,
        source: r.entry.sourceId
            ? { name: r.sourceName, icon: r.sourceIcon }
            : null,
    }));
};
