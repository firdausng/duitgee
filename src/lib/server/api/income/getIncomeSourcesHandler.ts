import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeSources } from '$lib/server/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { GetIncomeSourcesQuery } from '$lib/schemas/income';

export const getIncomeSources = async (
    session: App.AuthSession,
    query: GetIncomeSourcesQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });
    return client
        .select()
        .from(incomeSources)
        .where(
            and(
                eq(incomeSources.vaultId, query.vaultId),
                isNull(incomeSources.deletedAt),
            ),
        )
        .orderBy(desc(incomeSources.usageCount), desc(incomeSources.updatedAt));
};
