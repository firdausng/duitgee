import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundPolicies } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';

export const getFunds = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
) => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('Permission denied: not a member of this vault');

    const client = drizzle(env.DB, { schema });

    const rows = await client
        .select({
            fund: funds,
            activeCycle: fundCycles,
            policy: fundPolicies,
        })
        .from(funds)
        .leftJoin(
            fundCycles,
            and(eq(fundCycles.fundId, funds.id), eq(fundCycles.status, 'active')),
        )
        .leftJoin(fundPolicies, eq(fundPolicies.fundId, funds.id))
        .where(and(eq(funds.vaultId, vaultId), isNull(funds.deletedAt)))
        .orderBy(funds.createdAt);

    return rows;
};
