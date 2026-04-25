import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import * as authSchema from '$lib/server/db/better-auth-schema';
import { invitation, vaultMembers } from '$lib/server/db/schema';
import { user as authUser } from '$lib/server/db/better-auth-schema';
import { and, eq, inArray } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';

export type VaultPendingInvitation = {
    id: string;
    role: string | null;
    inviterId: string | null;
    inviteeId: string | null;
    inviteeEmail: string | null;
    inviteeName: string | null;
    invitedAt: string | null; // from vault_members.joinedAt (set at invite time)
};

/**
 * Pending invitations for a single vault, hydrated with the invitee's email +
 * name from the auth DB. Read-only view — used by the members page.
 */
export const getVaultPendingInvitations = async (
    session: App.AuthSession,
    vaultId: string,
    env: Cloudflare.Env,
): Promise<VaultPendingInvitation[]> => {
    // Any active vault member can see pending invitations for that vault.
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    const client = drizzle(env.DB, { schema });

    const rows = await client
        .select({
            id: invitation.id,
            role: invitation.role,
            inviterId: invitation.inviterId,
            inviteeId: invitation.inviteeId,
            invitedAt: vaultMembers.joinedAt,
        })
        .from(invitation)
        .leftJoin(
            vaultMembers,
            and(
                eq(vaultMembers.vaultId, invitation.vaultId),
                eq(vaultMembers.userId, invitation.inviteeId),
            ),
        )
        .where(and(
            eq(invitation.vaultId, vaultId),
            eq(invitation.status, 'pending'),
        ));

    if (rows.length === 0) return [];

    // Hydrate invitee email/name from auth DB.
    const inviteeIds = rows
        .map((r) => r.inviteeId)
        .filter((id): id is string => Boolean(id));

    const userMap = new Map<string, { email: string | null; name: string | null }>();
    if (inviteeIds.length > 0) {
        try {
            const authClient = drizzle(env.AUTH_DB, { schema: authSchema });
            const users = await authClient
                .select({ id: authUser.id, email: authUser.email, name: authUser.name })
                .from(authUser)
                .where(inArray(authUser.id, inviteeIds));
            for (const u of users) userMap.set(u.id, { email: u.email, name: u.name });
        } catch (err) {
            console.error('Failed to hydrate pending invitee details:', err);
            // Fall through — return rows without email/name; the page renders the ID as fallback.
        }
    }

    return rows.map((r) => {
        const u = r.inviteeId ? userMap.get(r.inviteeId) : undefined;
        return {
            id: r.id,
            role: r.role,
            inviterId: r.inviterId,
            inviteeId: r.inviteeId,
            inviteeEmail: u?.email ?? null,
            inviteeName: u?.name ?? null,
            invitedAt: r.invitedAt,
        };
    });
};
