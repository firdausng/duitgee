import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeEntries, incomeSources } from '$lib/server/db/schema';
import { and, eq, isNull, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { initialAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { getVaultPlanLimit } from '$lib/server/utils/entitlements';
import { attachFundToIncome } from '$lib/server/api/funds/fundIncomeHelpers';
import type { CreateIncomeEntryWithSourceRequest } from '$lib/schemas/income';

/**
 * Combined create: makes both a new income source AND a new entry in one batch.
 * Used by the new-entry form's inline "+ New source" flow so users don't have
 * to round-trip through a separate source-create dialog.
 */
export const createIncomeEntryWithSource = async (
    session: App.AuthSession,
    data: CreateIncomeEntryWithSourceRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    // Source cap applies to the new source being created.
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

    const sourceId = createId();
    const entryId = createId();
    const audit = initialAuditFields({ userId });

    // Batch the two inserts so they commit atomically (D1 lacks transactions).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.batch([
        client.insert(incomeSources).values({
            id: sourceId,
            vaultId: data.vaultId,
            name: data.sourceName,
            icon: data.sourceIcon ?? '💰',
            iconType: 'emoji',
            defaultAmount: data.amount,
            defaultPaidTo: data.paidTo ?? null,
            defaultFundId: data.fundId ?? null,
            defaultNote: null,
            usageCount: 1,
            lastUsedAt: data.date,
            ...audit,
        }),
        client.insert(incomeEntries).values({
            id: entryId,
            vaultId: data.vaultId,
            sourceId,
            amount: data.amount,
            date: data.date,
            paidTo: data.paidTo ?? null,
            note: data.note ?? null,
            fundId: data.fundId ?? null,
            // fundTransactionId is set in the follow-up step below; can't be
            // batched because attachFundToIncome itself runs multi-statement work
            // that already commits.
            fundTransactionId: null,
            ...audit,
        }),
    ] as any);

    // Fund routing happens after the atomic batch so the entry row exists for
    // the transaction's expenseId pointer.
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
        await client
            .update(incomeEntries)
            .set({ fundTransactionId })
            .where(eq(incomeEntries.id, entryId));
    }

    return { sourceId, entryId, fundTransactionId };
};
