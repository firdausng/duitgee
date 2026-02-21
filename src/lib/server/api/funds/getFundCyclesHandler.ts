import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import { checkVaultEntitlement } from '$lib/server/utils/entitlements';

export const getFundCycles = async (
    fundId: string,
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
) => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('Permission denied: not a member of this vault');

    const client = drizzle(env.DB, { schema });

    // Verify fund belongs to vault
    const [fund] = await client
        .select({ id: funds.id })
        .from(funds)
        .where(and(eq(funds.id, fundId), eq(funds.vaultId, vaultId), isNull(funds.deletedAt)))
        .limit(1);

    if (!fund) throw new Error('Fund not found');

    const hasHistory = await checkVaultEntitlement(vaultId, 'fund:cycle_history', env);

    const allCycles = await client
        .select()
        .from(fundCycles)
        .where(eq(fundCycles.fundId, fundId))
        .orderBy(fundCycles.periodStart);

    if (hasHistory) {
        return { cycles: allCycles, historyAllowed: true };
    }

    // Free plan: only the active cycle
    const activeCycles = allCycles.filter(c => c.status === 'active');
    return { cycles: activeCycles, historyAllowed: false };
};
