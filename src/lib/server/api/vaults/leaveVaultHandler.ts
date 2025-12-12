import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {LeaveVaultRequest} from "$lib/schemas/vaults";
import {vaultMembers} from "$lib/server/db/schema";
import {and, eq} from "drizzle-orm";
import {getUserVaultRole} from "$lib/server/utils/vaultPermissions";
import {formatISO} from "date-fns";
import {UTCDate} from "@date-fns/utc";

export const leaveVault = async (
    session: App.AuthSession,
    data: LeaveVaultRequest,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    const { vaultId } = data;
    const userId = session.user.id;

    // Check user's role in the vault
    const userRole = await getUserVaultRole(userId, vaultId, env);

    if (!userRole) {
        throw new Error('You are not a member of this vault');
    }

    // Prevent owner from leaving (must transfer ownership or delete vault)
    if (userRole === 'owner') {
        throw new Error('Vault owner cannot leave. Transfer ownership or delete the vault instead.');
    }

    // Check if member exists and is active
    const membership = await client
        .select()
        .from(vaultMembers)
        .where(
            and(
                eq(vaultMembers.vaultId, vaultId),
                eq(vaultMembers.userId, userId),
                eq(vaultMembers.status, 'active')
            )
        )
        .limit(1);

    if (!membership || membership.length === 0) {
        throw new Error('Active membership not found');
    }

    // Update status to 'removed' (member leaving voluntarily)
    const [leftMembership] = await client
        .update(vaultMembers)
        .set({
            status: 'removed',
            deletedAt: formatISO(new UTCDate()),
        })
        .where(
            and(
                eq(vaultMembers.vaultId, vaultId),
                eq(vaultMembers.userId, userId)
            )
        )
        .returning();

    return leftMembership;
};
