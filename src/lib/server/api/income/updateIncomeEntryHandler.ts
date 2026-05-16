import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeEntries, incomeSources } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { attachFundToIncome, detachFundFromIncome } from '$lib/server/api/funds/fundIncomeHelpers';
import type { UpdateIncomeEntryRequest } from '$lib/schemas/income';

/**
 * Edit a single income entry. Fund integration rewires the top-up transaction
 * when fundId or amount changes:
 *   - fundId added       → attach new top-up
 *   - fundId removed     → detach existing top-up
 *   - fundId changed     → detach + attach
 *   - same fund, new amt → detach + attach (simpler than computing a delta)
 *
 * The delta path used for paid_by_fund expenses isn't strictly necessary here;
 * top-ups always commit the full new amount, so a clean detach + re-attach is
 * both correct and easier to reason about.
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

    const next = {
        sourceId: data.sourceId !== undefined ? data.sourceId : existing.sourceId,
        amount: data.amount ?? existing.amount,
        date: data.date ?? existing.date,
        paidTo: data.paidTo !== undefined ? data.paidTo : existing.paidTo,
        note: data.note !== undefined ? data.note : existing.note,
        fundId: data.fundId !== undefined ? data.fundId : existing.fundId,
    };

    const fundChanged = next.fundId !== existing.fundId;
    const amountChanged = next.amount !== existing.amount;
    const needsRewire = next.fundId && (fundChanged || amountChanged);

    let newTxnId: string | null = existing.fundTransactionId;

    if (fundChanged || amountChanged) {
        // Reverse the prior top-up (no-op if there wasn't one).
        await detachFundFromIncome(existing.fundTransactionId, userId, env);
        newTxnId = null;
    }
    if (needsRewire) {
        newTxnId = await attachFundToIncome(
            existing.id,
            existing.vaultId,
            next.fundId!,
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
