import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import * as authSchema from "$lib/server/db/better-auth-schema";
import {invitation, vaultMembers} from "$lib/server/db/schema";
import {user} from "$lib/server/db/better-auth-schema";
import {createId} from "@paralleldrive/cuid2";
import {formatISO} from "date-fns";
import {UTCDate} from "@date-fns/utc";
import {eq} from "drizzle-orm";

export const inviteUserToVault = async (
    vaultId: string,
    inviteeEmail: string,
    role: 'admin' | 'member',
    session: App.AuthSession,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const authClient = drizzle(env.AUTH_DB, { schema: authSchema });

    const invitees = await authClient
        .select({
            id: user.id,
            name: user.name,
            email: user.email
        })
        .from(user)
        .where(eq(user.email, inviteeEmail))
        .limit(1);

    if (!invitees) {
        throw new Error('User do not exist');
    }

    const invitationId = createId();

    const [newInvitation] = await client
        .insert(invitation)
        .values({
            id: invitationId,
            vaultId,
            role,
            inviteeId: invitees.id,
            inviterId: session.user.id,
            status: 'pending',
        })
        .returning();

    // Create vault member with pending status
    const [newMember] = await client
        .insert(vaultMembers)
        .values({
            vaultId,
            userId: invitees.id,
            displayName: invitees.name ?? invitees.email,
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