import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {vaults, vaultMembers} from "$lib/server/db/schema";
import {and, eq, isNull } from "drizzle-orm";

export const getVault = async (
    authSession: App.AuthSession,
    vaultId: string,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    // Get vault with all members in a single query
    const results = await client
        .select()
        .from(vaults)
        .leftJoin(vaultMembers, eq(vaults.id, vaultMembers.vaultId))
        .where(and(
            eq(vaults.id, vaultId),
            isNull(vaults.deletedAt)
        ));

    if (!results || results.length === 0) {
        return null;
    }

    // Check if current user is an active member
    const userMembership = results.find(
        r => r.vault_members?.userId === authSession.user.id &&
             r.vault_members?.status === 'active'
    );

    if (!userMembership) {
        throw new Error('You do not have access to this vault');
    }

    // Get the vault data (same for all rows)
    const vaultData = results[0].vaults;

    // Get current user's membership
    const currentMembership = userMembership.vault_members;

    // Extract all active members
    const members = results
        .filter(r => r.vault_members && r.vault_members.status === 'active')
        .map(r => ({
            userId: r.vault_members!.userId,
            displayName: r.vault_members!.displayName || r.vault_members!.userId,
            role: r.vault_members!.role,
            joinedAt: r.vault_members!.joinedAt
        }));

    return {
        vaults: vaultData,
        vaultMembers: currentMembership,
        members
    };
};
