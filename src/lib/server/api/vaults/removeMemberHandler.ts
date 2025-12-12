import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {RemoveMemberRequest} from "$lib/schemas/vaults";
import {vaultMembers} from "$lib/server/db/schema";
import {and, eq} from "drizzle-orm";
import {requireVaultPermission, getUserVaultRole} from "$lib/server/utils/vaultPermissions";
import {formatISO} from "date-fns";
import {UTCDate} from "@date-fns/utc";

export const removeMember = async (
    session: App.AuthSession,
    data: RemoveMemberRequest,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    const { vaultId, userId } = data;

    // Check permission - only owner/admin can remove members
    await requireVaultPermission(session, vaultId, 'canManageMembers', env);

    // Prevent removing yourself (use leaveVault instead)
    if (userId === session.user.id) {
        throw new Error('Cannot remove yourself. Use leave vault instead.');
    }

    // Check if target user is a member
    const memberToRemove = await client
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

    if (!memberToRemove || memberToRemove.length === 0) {
        throw new Error('Member not found or already removed');
    }

    // Prevent removing the owner
    if (memberToRemove[0].role === 'owner') {
        throw new Error('Cannot remove vault owner');
    }

    // Only owner can remove admins
    if (memberToRemove[0].role === 'admin') {
        const currentUserRole = await getUserVaultRole(session.user.id, vaultId, env);
        if (currentUserRole !== 'owner') {
            throw new Error('Only vault owner can remove admins');
        }
    }

    // Update member status to 'removed' (soft delete)
    const [removedMember] = await client
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

    return removedMember;
};
