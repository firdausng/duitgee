import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { LinkIncomeTemplateRequest } from '$lib/schemas/income';

/**
 * Sets or clears `previousTemplateId` on an existing template. Walks up the
 * target's ancestor chain to detect cycles (rejects if current template is in
 * target's ancestors). Mirrors linkRecurringExpense exactly.
 */
export const linkIncomeTemplate = async (
    session: App.AuthSession,
    data: LinkIncomeTemplateRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [template] = await client
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
    if (!template) throw new Error('Income template not found');

    if (data.previousTemplateId === template.id) {
        throw new Error('A template cannot reference itself as previous');
    }

    if (data.previousTemplateId) {
        const [target] = await client
            .select()
            .from(incomeTemplates)
            .where(
                and(
                    eq(incomeTemplates.id, data.previousTemplateId),
                    eq(incomeTemplates.vaultId, data.vaultId),
                    isNull(incomeTemplates.deletedAt),
                ),
            )
            .limit(1);
        if (!target) throw new Error('Target template not found in this vault');

        // Cycle prevention — bounded walk up the ancestor chain.
        let cursor: string | null = target.previousTemplateId;
        let hops = 0;
        while (cursor && hops < 32) {
            if (cursor === template.id) {
                throw new Error('Linking would create a loop');
            }
            const [parent] = await client
                .select({ previousTemplateId: incomeTemplates.previousTemplateId })
                .from(incomeTemplates)
                .where(eq(incomeTemplates.id, cursor))
                .limit(1);
            cursor = parent?.previousTemplateId ?? null;
            hops++;
        }
    }

    const [updated] = await client
        .update(incomeTemplates)
        .set({
            previousTemplateId: data.previousTemplateId,
            ...updateAuditFields({ userId }),
        })
        .where(eq(incomeTemplates.id, template.id))
        .returning();

    return updated;
};
