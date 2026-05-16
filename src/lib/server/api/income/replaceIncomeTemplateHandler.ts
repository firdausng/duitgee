import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { ReplaceIncomeTemplateRequest } from '$lib/schemas/income';

/**
 * Mark an income template as ended (terminal). Hides it from pickers but keeps
 * the row for history and lineage queries. The follow-up new template carries
 * previousTemplateId pointing back; that link is set by the create handler, not
 * here — this endpoint just terminates the current template.
 */
export const replaceIncomeTemplate = async (
    session: App.AuthSession,
    data: ReplaceIncomeTemplateRequest,
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
    if (existing.endedAt) throw new Error('Template is already ended');

    const [updated] = await client
        .update(incomeTemplates)
        .set({
            endedAt: formatISO(new UTCDate()),
            ...updateAuditFields({ userId }),
        })
        .where(eq(incomeTemplates.id, data.id))
        .returning();

    return updated;
};
