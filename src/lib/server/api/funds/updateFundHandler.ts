import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds } from '$lib/server/db/schema';
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

    return updated;
};
