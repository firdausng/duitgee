import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { deleteAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { DeleteIncomeTemplateRequest } from '$lib/schemas/income';

export const deleteIncomeTemplate = async (
    session: App.AuthSession,
    data: DeleteIncomeTemplateRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [existing] = await client
        .select()
        .from(incomeTemplates)
        .where(
            and(
                eq(incomeTemplates.id, data.id),
                eq(incomeTemplates.vaultId, data.vaultId),
                isNull(incomeTemplates.deletedAt),
            ),
        )
        .limit(1);
    if (!existing) throw new Error('Income template not found');

    await client
        .update(incomeTemplates)
        .set(deleteAuditFields({ userId }))
        .where(eq(incomeTemplates.id, data.id));

    return { id: data.id };
};
