import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {UpdateMemberRoleRequest} from "$lib/schemas/vaults";
import {vaultMembers} from "$lib/server/db/schema";
import {and, eq} from "drizzle-orm";
import {requireVaultPermission, getUserVaultRole} from "$lib/server/utils/vaultPermissions";
import {formatISO} from "date-fns";
import {UTCDate} from "@date-fns/utc";

export const updateMemberRole = async (
    session: App.AuthSession,
    data: UpdateMemberRoleRequest,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    const { vaultId, userId, role } = data;

    // Check permission - only owner/admin can manage members
    await requireVaultPermission(session, vaultId, 'canManageMembers', env);

    // Prevent changing your own role
    if (userId === session.user.id) {
        throw new Error('Cannot change your own role');
    }

    // Check if target user is a member
    const memberToUpdate = await client
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

    if (!memberToUpdate || memberToUpdate.length === 0) {
        throw new Error('Member not found');
    }

    // Prevent changing the owner's role
    if (memberToUpdate[0].role === 'owner') {
        throw new Error('Cannot change vault owner role');
    }

    // Only owner can promote to admin or demote admin
    const currentMemberRole = memberToUpdate[0].role;
    if (currentMemberRole === 'admin' || role === 'admin') {
        const currentUserRole = await getUserVaultRole(session.user.id, vaultId, env);
        if (currentUserRole !== 'owner') {
            throw new Error('Only vault owner can promote to admin or demote admins');
        }
    }

    // Update member role
    const [updatedMember] = await client
        .update(vaultMembers)
        .set({
            role,
            updatedAt: formatISO(new UTCDate()),
        })
        .where(
            and(
                eq(vaultMembers.vaultId, vaultId),
                eq(vaultMembers.userId, userId)
            )
        )
        .returning();

    return updatedMember;
};
