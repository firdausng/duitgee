import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundPolicies } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { updateAuditFields } from '$lib/server/utils/audit';
import type { UpdateFund } from '$lib/schemas/funds';

export const updateFund = async (
    session: App.AuthSession,
    data: UpdateFund,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canManageFunds', env);

    const client = drizzle(env.DB, { schema });

    const [existing] = await client
        .select({ id: funds.id })
        .from(funds)
        .where(and(eq(funds.id, data.id), eq(funds.vaultId, data.vaultId), isNull(funds.deletedAt)))
        .limit(1);

    if (!existing) throw new Error('Fund not found');

    const updates: Record<string, unknown> = { ...updateAuditFields({ userId: session.user.id }) };
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.color !== undefined) updates.color = data.color;
    if (data.icon !== undefined) updates.icon = data.icon;
    if (data.iconType !== undefined) updates.iconType = data.iconType;

    const [updated] = await client
        .update(funds)
        .set(updates)
        .where(eq(funds.id, data.id))
        .returning();

    // Update carry-over policy settings if provided
    if (data.carryOverBalance !== undefined) {
        if (data.carryOverBalance && data.carryOverFundId) {
            const [targetPolicy] = await client
                .select({ replenishmentType: fundPolicies.replenishmentType })
                .from(fundPolicies)
                .innerJoin(funds, eq(fundPolicies.fundId, funds.id))
                .where(
                    and(
                        eq(fundPolicies.fundId, data.carryOverFundId),
                        eq(funds.vaultId, data.vaultId),
                        isNull(funds.deletedAt),
                    ),
                )
                .limit(1);

            if (!targetPolicy) throw new Error('Target fund not found in this vault');
            if (targetPolicy.replenishmentType === 'top_to_ceiling')
                throw new Error('Target fund cannot be a "Top to Ceiling" type');
        }

        await client
            .update(fundPolicies)
            .set({
                carryOverBalance: data.carryOverBalance ? 1 : 0,
                carryOverFundId: data.carryOverBalance ? (data.carryOverFundId ?? null) : null,
                ...updateAuditFields({ userId: session.user.id }),
            })
            .where(eq(fundPolicies.fundId, data.id));
    }

    return updated;
};
