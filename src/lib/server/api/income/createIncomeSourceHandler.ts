import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeSources } from '$lib/server/db/schema';
import { and, eq, isNull, count } from 'drizzle-orm';
import { initialAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { getVaultPlanLimit } from '$lib/server/utils/entitlements';
import type { CreateIncomeSourceRequest } from '$lib/schemas/income';

export const createIncomeSource = async (
    session: App.AuthSession,
    data: CreateIncomeSourceRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const cap = await getVaultPlanLimit(data.vaultId, 'maxIncomeSourcesPerVault', env);
    if (cap !== -1) {
        const [existing] = await client
            .select({ n: count() })
            .from(incomeSources)
            .where(
                and(
                    eq(incomeSources.vaultId, data.vaultId),
                    isNull(incomeSources.deletedAt),
                ),
            );
        if ((existing?.n ?? 0) >= cap) {
            throw new Error(
                `Income source limit reached: this vault's plan allows ${cap} sources. Upgrade to Pro for unlimited.`,
            );
        }
    }

    const [source] = await client
        .insert(incomeSources)
        .values({
            vaultId: data.vaultId,
            name: data.name,
            icon: data.icon ?? '💰',
            iconType: 'emoji',
            ...initialAuditFields({ userId }),
        })
        .returning();

    return source;
};
