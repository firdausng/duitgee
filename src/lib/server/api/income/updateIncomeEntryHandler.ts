import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeEntries, incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { attachFundToIncome, detachFundFromIncome } from '$lib/server/api/funds/fundIncomeHelpers';
import type { UpdateIncomeEntryRequest } from '$lib/schemas/income';

/**
 * Edit a single income entry. Template attribution rules:
 *   - If templateId is set, sourceId is derived from the template.
 *   - If only sourceId is set, template is cleared.
 *   - Both null is allowed (fully ad-hoc).
 *
 * Fund integration rewires the top-up transaction when fundId or amount
 * changes — detach + re-attach (simpler than computing a delta for top-ups).
 */
export const updateIncomeEntry = async (
    session: App.AuthSession,
    data: UpdateIncomeEntryRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [existing] = await client
        .select()
        .from(incomeEntries)
        .where(
            and(
                eq(incomeEntries.id, data.id),
                eq(incomeEntries.vaultId, data.vaultId),
                isNull(incomeEntries.deletedAt),
            ),
        )
        .limit(1);
    if (!existing) throw new Error('Income entry not found');

    let nextTemplateId: string | null = existing.templateId;
    let nextSourceId: string | null = existing.sourceId;

    if (data.templateId !== undefined) {
        nextTemplateId = data.templateId;
        if (data.templateId) {
            const [template] = await client
                .select({ sourceId: incomeTemplates.sourceId })
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
            nextSourceId = template.sourceId;
        } else {
            // Cleared the template — fall back to whatever sourceId was provided
            // (or keep existing source if neither field changed simultaneously).
            nextSourceId = data.sourceId !== undefined ? data.sourceId : existing.sourceId;
        }
    } else if (data.sourceId !== undefined) {
        if (data.sourceId) {
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
        nextSourceId = data.sourceId;
    }

    const next = {
        templateId: nextTemplateId,
        sourceId: nextSourceId,
        amount: data.amount ?? existing.amount,
        date: data.date ?? existing.date,
        paidTo: data.paidTo !== undefined ? data.paidTo : existing.paidTo,
        note: data.note !== undefined ? data.note : existing.note,
        fundId: data.fundId !== undefined ? data.fundId : existing.fundId,
    };

    const fundChanged = next.fundId !== existing.fundId;
    const amountChanged = next.amount !== existing.amount;

    let newTxnId: string | null = existing.fundTransactionId;

    if (fundChanged || amountChanged) {
        await detachFundFromIncome(existing.fundTransactionId, userId, env);
        newTxnId = null;
    }
    if (next.fundId && (fundChanged || amountChanged)) {
        newTxnId = await attachFundToIncome(
            existing.id,
            existing.vaultId,
            next.fundId,
            next.amount,
            userId,
            env,
        );
    } else if (!next.fundId) {
        newTxnId = null;
    }

    const [updated] = await client
        .update(incomeEntries)
        .set({
            ...next,
            fundTransactionId: newTxnId,
            ...updateAuditFields({ userId }),
        })
        .where(eq(incomeEntries.id, existing.id))
        .returning();

    return updated;
};
