import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {invitation, vaultMembers} from "$lib/server/db/schema";
import {createId} from "@paralleldrive/cuid2";
import {formatISO} from "date-fns";
import {UTCDate} from "@date-fns/utc";

export const inviteUserToVault = async (
    vaultId: string,
    inviteeId: string,
    inviteeDisplayName: string,
    role: 'admin' | 'member',
    session: App.AuthSession,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const invitationId = createId();

    const [newInvitation] = await client
        .insert(invitation)
        .values({
            id: invitationId,
            vaultId,
            role,
            inviteeId,
            inviterId: session.user.id,
            status: 'pending',
        })
        .returning();

    // Create vault member with pending status
    const [newMember] = await client
        .insert(vaultMembers)
        .values({
            vaultId,
            userId: inviteeId,
            displayName: inviteeDisplayName,
            role,
            invitedBy: session.user.id,
            status: 'pending',
            joinedAt: formatISO(new UTCDate()),
        })
        .returning();

    return {
        invitation: newInvitation,
        member: newMember,
    };
};