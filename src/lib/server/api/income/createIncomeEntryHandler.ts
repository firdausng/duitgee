import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeEntries, incomeSources } from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { attachFundToIncome } from '$lib/server/api/funds/fundIncomeHelpers';
import type { CreateIncomeEntryRequest } from '$lib/schemas/income';

export const createIncomeEntry = async (
    session: App.AuthSession,
    data: CreateIncomeEntryRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    // If a source is provided, validate it lives in the same vault.
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
            sourceId: data.sourceId ?? null,
            amount: data.amount,
            date: data.date,
            paidTo: data.paidTo ?? null,
            note: data.note ?? null,
            fundId: data.fundId ?? null,
            fundTransactionId,
            ...initialAuditFields({ userId }),
        })
        .returning();

    // Bump source usage stats so pickers can sort by recency-of-use.
    if (data.sourceId) {
        await client
            .update(incomeSources)
            .set({
                usageCount: sql`${incomeSources.usageCount} + 1`,
                lastUsedAt: formatISO(new UTCDate()),
                ...updateAuditFields({ userId }),
            })
            .where(eq(incomeSources.id, data.sourceId));
    }

    return entry;
};
