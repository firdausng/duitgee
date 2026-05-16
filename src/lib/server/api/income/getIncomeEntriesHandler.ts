import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeEntries, incomeSources } from '$lib/server/db/schema';
import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { GetIncomeEntriesQuery } from '$lib/schemas/income';

export const getIncomeEntries = async (
    session: App.AuthSession,
    query: GetIncomeEntriesQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });

    const conditions = [
        eq(incomeEntries.vaultId, query.vaultId),
        isNull(incomeEntries.deletedAt),
    ];
    if (query.startDate) conditions.push(gte(incomeEntries.date, query.startDate));
    if (query.endDate) conditions.push(lte(incomeEntries.date, query.endDate));
    if (query.sourceId) conditions.push(eq(incomeEntries.sourceId, query.sourceId));

    const rows = await client
        .select({
            entry: incomeEntries,
            sourceName: incomeSources.name,
            sourceIcon: incomeSources.icon,
        })
        .from(incomeEntries)
        .leftJoin(incomeSources, eq(incomeEntries.sourceId, incomeSources.id))
        .where(and(...conditions))
        .orderBy(desc(incomeEntries.date), desc(incomeEntries.createdAt));

    return rows.map((r) => ({
        ...r.entry,
        source: r.entry.sourceId
            ? { name: r.sourceName, icon: r.sourceIcon }
            : null,
    }));
};
