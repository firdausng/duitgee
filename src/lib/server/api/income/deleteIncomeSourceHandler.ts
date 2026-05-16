import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { deleteAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { DeleteIncomeSourceRequest } from '$lib/schemas/income';

/**
 * Soft delete a source. Cascades the soft delete to every template under it
 * so the picker doesn't surface orphan templates pointing at a deleted source.
 * Income entries are NOT touched — their `sourceId` is preserved for historical
 * stats; the join falls back to null/(deleted) in the UI.
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

    const audit = deleteAuditFields({ userId });

    // Soft-delete the source + every template under it in one batch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.batch([
        client
            .update(incomeSources)
            .set(audit)
            .where(eq(incomeSources.id, data.id)),
        client
            .update(incomeTemplates)
            .set(audit)
            .where(
                and(
                    eq(incomeTemplates.sourceId, data.id),
                    isNull(incomeTemplates.deletedAt),
                ),
            ),
    ] as any);

    return { id: data.id };
};
