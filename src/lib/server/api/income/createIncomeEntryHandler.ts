import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeEntries, incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { attachFundToIncome } from '$lib/server/api/funds/fundIncomeHelpers';
import type { CreateIncomeEntryRequest } from '$lib/schemas/income';

/**
 * Record a single income entry. Source attribution rules:
 *   - templateId provided → sourceId is derived from template.sourceId.
 *   - templateId null, sourceId provided → ad-hoc-with-source (no template).
 *   - both null → fully ad-hoc.
 *
 * Picking a template bumps its usageCount + lastUsedAt so the picker can sort
 * by most-used.
 */
export const createIncomeEntry = async (
    session: App.AuthSession,
    data: CreateIncomeEntryRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    let resolvedSourceId: string | null = data.sourceId ?? null;

    if (data.templateId) {
        const [template] = await client
            .select({ id: incomeTemplates.id, sourceId: incomeTemplates.sourceId })
            .from(incomeTemplates)
            .where(
                and(
                    eq(incomeTemplates.id, data.templateId),
                    eq(incomeTemplates.vaultId, data.vaultId),
                    isNull(incomeTemplates.deletedAt),
                ),
            )
            .limit(1);
        if (!template) throw new Error('Income template not found in this vault');
        // Template's source wins, even if the caller also passed sourceId.
        resolvedSourceId = template.sourceId;
    } else if (data.sourceId) {
        const [source] = await client
            .select({ id: incomeSources.id })
            .from(incomeSources)
            .where(
                and(
                    eq(incomeSources.id, data.sourceId),
                    eq(incomeSources.vaultId, data.vaultId),
                    isNull(incomeSources.deletedAt),
                ),
            )
            .limit(1);
        if (!source) throw new Error('Income source not found in this vault');
    }

    const entryId = createId();
    let fundTransactionId: string | null = null;

    if (data.fundId) {
        fundTransactionId = await attachFundToIncome(
            entryId,
            data.vaultId,
            data.fundId,
            data.amount,
            userId,
            env,
        );
    }

    const [entry] = await client
        .insert(incomeEntries)
        .values({
            id: entryId,
            vaultId: data.vaultId,
            templateId: data.templateId ?? null,
            sourceId: resolvedSourceId,
            amount: data.amount,
            date: data.date,
            paidTo: data.paidTo ?? null,
            note: data.note ?? null,
            fundId: data.fundId ?? null,
            fundTransactionId,
            ...initialAuditFields({ userId }),
        })
        .returning();

    if (data.templateId) {
        await client
            .update(incomeTemplates)
            .set({
                usageCount: sql`${incomeTemplates.usageCount} + 1`,
                lastUsedAt: formatISO(new UTCDate()),
                ...updateAuditFields({ userId }),
            })
            .where(eq(incomeTemplates.id, data.templateId));
    }

    return entry;
};
