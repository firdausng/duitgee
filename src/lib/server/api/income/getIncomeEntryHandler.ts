import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeEntries, incomeSources } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { GetIncomeEntryQuery } from '$lib/schemas/income';

export const getIncomeEntry = async (
    session: App.AuthSession,
    query: GetIncomeEntryQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });
    const [row] = await client
        .select({
            entry: incomeEntries,
            sourceName: incomeSources.name,
            sourceIcon: incomeSources.icon,
        })
        .from(incomeEntries)
        .leftJoin(incomeSources, eq(incomeEntries.sourceId, incomeSources.id))
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
        source: row.entry.sourceId
            ? { name: row.sourceName, icon: row.sourceIcon }
            : null,
    };
};
