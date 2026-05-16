import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeSources } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { UpdateIncomeSourceRequest } from '$lib/schemas/income';

export const updateIncomeSource = async (
    session: App.AuthSession,
    data: UpdateIncomeSourceRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [existing] = await client
        .select()
        .from(incomeSources)
        .where(
            and(
                eq(incomeSources.id, data.id),
                eq(incomeSources.vaultId, data.vaultId),
                isNull(incomeSources.deletedAt),
            ),
        )
        .limit(1);
    if (!existing) throw new Error('Income source not found');

    const next = {
        name: data.name ?? existing.name,
        icon: data.icon !== undefined ? data.icon : existing.icon,
        defaultAmount: data.defaultAmount !== undefined ? data.defaultAmount : existing.defaultAmount,
        defaultPaidTo: data.defaultPaidTo !== undefined ? data.defaultPaidTo : existing.defaultPaidTo,
        defaultFundId: data.defaultFundId !== undefined ? data.defaultFundId : existing.defaultFundId,
        defaultNote: data.defaultNote !== undefined ? data.defaultNote : existing.defaultNote,
    };

    const [updated] = await client
        .update(incomeSources)
        .set({ ...next, ...updateAuditFields({ userId }) })
        .where(eq(incomeSources.id, data.id))
        .returning();

    return updated;
};
