import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { invitation, vaultMembers } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { RevokeInvitationRequest } from '$lib/schemas/invitations';

/**
 * Cancel a pending invitation. Sets invitation.status = 'revoked' and removes
 * the corresponding pending vault_members row so the invitee can no longer
 * accept it. Idempotent — re-calling on an already-revoked invitation is a noop.
 */
export const revokeInvitation = async (
    session: App.AuthSession,
    data: RevokeInvitationRequest,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canManageMembers', env);

    const client = drizzle(env.DB, { schema });

    const [existing] = await client
        .select()
        .from(invitation)
        .where(and(
            eq(invitation.id, data.invitationId),
            eq(invitation.vaultId, data.vaultId),
        ))
        .limit(1);

    if (!existing) {
        throw new Error('Invitation not found');
    }

    if (existing.status !== 'pending') {
        // Already accepted/declined/revoked — nothing to do.
        return { id: existing.id, status: existing.status };
    }

    // Atomic: revoke the invitation + drop the pending member row in one batch.
    const ops = [
        client
            .update(invitation)
            .set({ status: 'revoked' })
            .where(eq(invitation.id, existing.id)),
    ];

    if (existing.inviteeId) {
        ops.push(
            client
                .delete(vaultMembers)
                .where(and(
                    eq(vaultMembers.vaultId, existing.vaultId),
                    eq(vaultMembers.userId, existing.inviteeId),
                    eq(vaultMembers.status, 'pending'),
                )) as never,
        );
    }

    await client.batch(ops as [typeof ops[0], ...typeof ops]);

    return { id: existing.id, status: 'revoked' };
};
