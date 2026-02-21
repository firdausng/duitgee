import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundPolicies, fundCycles } from '$lib/server/db/schema';
import { eq, and, isNull, count } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import { initialAuditFields } from '$lib/server/utils/audit';
import { calculateCyclePeriod } from './cyclePeriod';
import type { CreateFund } from '$lib/schemas/funds';

export const createFund = async (
    session: App.AuthSession,
    data: CreateFund,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canManageFunds', env);
    await requireVaultEntitlement(session, data.vaultId, 'fund:create', env);

    // If auto-replenishment policy, check entitlement
    if (data.replenishmentType === 'fixed_amount' || data.replenishmentType === 'top_to_ceiling') {
        await requireVaultEntitlement(session, data.vaultId, 'fund:auto_replenishment', env);
    }

    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    // If vault already has an active fund, require fund:create_multiple
    const [{ value: activeFundCount }] = await client
        .select({ value: count() })
        .from(funds)
        .where(
            and(
                eq(funds.vaultId, data.vaultId),
                eq(funds.status, 'active'),
                isNull(funds.deletedAt),
            ),
        );

    if (activeFundCount >= 1) {
        await requireVaultEntitlement(session, data.vaultId, 'fund:create_multiple', env);
    }

    const { periodStart, periodEnd } = calculateCyclePeriod(data.replenishmentSchedule);
    const auditFields = initialAuditFields({ userId });

    // Insert fund, policy, and first cycle atomically
    const [fund] = await client
        .insert(funds)
        .values({
            vaultId: data.vaultId,
            name: data.name,
            description: data.description,
            color: data.color ?? '#10B981',
            icon: data.icon ?? '💰',
            iconType: data.iconType ?? 'emoji',
            balance: 0,
            status: 'active',
            ...auditFields,
        })
        .returning();

    const [policy] = await client
        .insert(fundPolicies)
        .values({
            fundId: fund.id,
            replenishmentType: data.replenishmentType,
            replenishmentAmount: data.replenishmentAmount ?? null,
            ceilingAmount: data.ceilingAmount ?? null,
            replenishmentSchedule: data.replenishmentSchedule ?? null,
            ...auditFields,
        })
        .returning();

    const [cycle] = await client
        .insert(fundCycles)
        .values({
            fundId: fund.id,
            periodStart,
            periodEnd,
            openingBalance: 0,
            status: 'active',
            ...auditFields,
        })
        .returning();

    return { fund, policy, cycle };
};
