import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeEntries, incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { initialAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { getVaultPlanLimit } from '$lib/server/utils/entitlements';
import { attachFundToIncome } from '$lib/server/api/funds/fundIncomeHelpers';
import type { CreateIncomeEntryWithTemplateRequest } from '$lib/schemas/income';

/**
 * Combined create: makes both a new template AND an entry in one batch.
 * The source must already exist — sources are a small vault taxonomy you pick
 * from, not something you coin inline. To create a new source, hit the source
 * management page first.
 */
export const createIncomeEntryWithTemplate = async (
    session: App.AuthSession,
    data: CreateIncomeEntryWithTemplateRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    // Source must exist in the same vault.
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

    // Template cap applies — we're creating a new template.
    const cap = await getVaultPlanLimit(data.vaultId, 'maxIncomeTemplatesPerVault', env);
    if (cap !== -1) {
        const [existing] = await client
            .select({ n: count() })
            .from(incomeTemplates)
            .where(
                and(
                    eq(incomeTemplates.vaultId, data.vaultId),
                    isNull(incomeTemplates.deletedAt),
                ),
            );
        if ((existing?.n ?? 0) >= cap) {
            throw new Error(
                `Income template limit reached: this vault's plan allows ${cap} templates. Upgrade to Pro for unlimited.`,
            );
        }
    }

    const templateId = createId();
    const entryId = createId();
    const audit = initialAuditFields({ userId });

    // Batch the two inserts so they commit atomically.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.batch([
        client.insert(incomeTemplates).values({
            id: templateId,
            vaultId: data.vaultId,
            sourceId: data.sourceId,
            name: data.templateName,
            icon: data.templateIcon ?? '💰',
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
            templateId,
            sourceId: data.sourceId,
            amount: data.amount,
            date: data.date,
            paidTo: data.paidTo ?? null,
            note: data.note ?? null,
            fundId: data.fundId ?? null,
            fundTransactionId: null,
            ...audit,
        }),
    ] as any);

    // Fund routing runs after the batch so the entry row exists for the
    // transaction's reverse pointer.
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

    return { templateId, entryId, fundTransactionId };
};
