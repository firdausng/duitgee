import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeTemplates } from '$lib/server/db/schema';
import { and, count, eq, isNull } from 'drizzle-orm';
import { initialAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { getVaultPlanLimit } from '$lib/server/utils/entitlements';
import type { DuplicateIncomeTemplateRequest } from '$lib/schemas/income';

/**
 * Clone an existing template. Useful when two household members have similar
 * salary structures — duplicate the first one, rename, adjust.
 *
 * What's copied: sourceId, icon, all defaults (amount, paidTo, fundId, note).
 * What resets: usageCount (0), lastUsedAt (null), previousTemplateId (null,
 * since a copy is an independent template not a continuation), endedAt (null).
 * The clone always starts active. Audit fields point at the duplicating user.
 */
export const duplicateIncomeTemplate = async (
    session: App.AuthSession,
    data: DuplicateIncomeTemplateRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [source] = await client
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
    if (!source) throw new Error('Income template not found');

    // Same template-per-vault cap applies — the clone is a brand-new row.
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

    const newName = data.name?.trim() || `${source.name} (copy)`;

    const [copy] = await client
        .insert(incomeTemplates)
        .values({
            vaultId: source.vaultId,
            sourceId: source.sourceId,
            name: newName,
            icon: source.icon,
            iconType: source.iconType,
            defaultAmount: source.defaultAmount,
            defaultPaidTo: source.defaultPaidTo,
            defaultFundId: source.defaultFundId,
            defaultNote: source.defaultNote,
            defaultAllowances: source.defaultAllowances,
            defaultDeductions: source.defaultDeductions,
            previousTemplateId: null,
            endedAt: null,
            usageCount: 0,
            lastUsedAt: null,
            ...initialAuditFields({ userId }),
        })
        .returning();

    return copy;
};
