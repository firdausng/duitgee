import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {invitation, vaultMembers} from "$lib/server/db/schema";
import {and, eq} from "drizzle-orm";
import {formatISO} from "date-fns";
import {UTCDate} from "@date-fns/utc";

export const acceptVaultInvitation = async ( // Renamed for clarity
    invitationId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const { userId, name, email } = session.user;

    const [invite] = await client
        .select()
        .from(invitation)
        .where(
            and(
                eq(invitation.id, invitationId),
                eq(invitation.status, 'pending')
            )
        )
        .limit(1);

    if (!invite) {
        throw new Error('Invitation not found or already used');
    }

    // Verify the invitation is for this user
    if (invite.inviteeId !== userId) {
        throw new Error('This invitation is not for you');
    }

    const [existingMember] = await client
        .select()
        .from(vaultMembers)
        .where(
            and(
                eq(vaultMembers.vaultId, invite.vaultId),
                eq(vaultMembers.userId, userId)
            )
        )
        .limit(1);

    if (!existingMember) {
        throw new Error('Membership record not found');
    }

    if (existingMember.status === 'active') {
        throw new Error('You are already a member of this vault');
    }

    if (existingMember.status !== 'pending') {
        throw new Error(`Cannot accept invitation with status: ${existingMember.status}`);
    }

    const [updatedMember] = await client
        .update(vaultMembers)
        .set({
            status: 'active',
            joinedAt: formatISO(new UTCDate()),
            displayName: name || email,
        })
        .where(eq(vaultMembers.id, existingMember.id))
        .returning();

    await client
        .update(invitation)
        .set({ status: 'accepted' })
        .where(eq(invitation.id, invitationId));

    return {
        member: updatedMember,
        invitation: invite,
    };
};