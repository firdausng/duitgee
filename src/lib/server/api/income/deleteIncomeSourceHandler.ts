import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeSources } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { deleteAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { DeleteIncomeSourceRequest } from '$lib/schemas/income';

/**
 * Soft delete an income source. Existing income entries that reference it keep
 * their sourceId — joins surface as "(deleted)" in the listing rather than null,
 * preserving historical attribution. Recurring rules referencing it would orphan
 * if Slice 3 is shipped; not a concern in Slice 1.
 */
export const deleteIncomeSource = async (
    session: App.AuthSession,
    data: DeleteIncomeSourceRequest,
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

    await client
        .update(incomeSources)
        .set(deleteAuditFields({ userId }))
        .where(eq(incomeSources.id, data.id));

    return { id: data.id };
};
