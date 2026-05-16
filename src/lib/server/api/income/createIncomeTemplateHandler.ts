import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull, count } from 'drizzle-orm';
import { initialAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { getVaultPlanLimit } from '$lib/server/utils/entitlements';
import type { CreateIncomeTemplateRequest } from '$lib/schemas/income';

export const createIncomeTemplate = async (
    session: App.AuthSession,
    data: CreateIncomeTemplateRequest,
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

    const [template] = await client
        .insert(incomeTemplates)
        .values({
            vaultId: data.vaultId,
            sourceId: data.sourceId,
            name: data.name,
            icon: data.icon ?? '💰',
            iconType: 'emoji',
            defaultAmount: data.defaultAmount ?? null,
            defaultPaidTo: data.defaultPaidTo ?? null,
            defaultFundId: data.defaultFundId ?? null,
            defaultNote: data.defaultNote ?? null,
            usageCount: 0,
            ...initialAuditFields({ userId }),
        })
        .returning();

    return template;
};
