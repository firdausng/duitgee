import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeSources } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { GetIncomeSourceQuery } from '$lib/schemas/income';

export const getIncomeSource = async (
    session: App.AuthSession,
    query: GetIncomeSourceQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });
    const [row] = await client
        .select()
        .from(incomeSources)
        .where(
            and(
                eq(incomeSources.id, query.id),
                eq(incomeSources.vaultId, query.vaultId),
                isNull(incomeSources.deletedAt),
            ),
        )
        .limit(1);
    return row ?? null;
};
