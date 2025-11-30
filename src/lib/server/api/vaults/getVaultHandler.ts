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
        .select({
            vaults: vaults,
            vaultMembers: vaultMembers
        })
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
        r => r.vaultMembers?.userId === authSession.user.id &&
             r.vaultMembers?.status === 'active'
    );

    if (!userMembership) {
        throw new Error('You do not have access to this vault');
    }

    // Get the vault data (same for all rows)
    const vaultData = results[0].vaults;

    // Get current user's membership
    const currentMembership = userMembership.vaultMembers;

    // Extract all active members
    const members = results
        .filter(r => r.vaultMembers && r.vaultMembers.status === 'active')
        .map(r => ({
            userId: r.vaultMembers!.userId,
            displayName: r.vaultMembers!.displayName || r.vaultMembers!.userId,
            role: r.vaultMembers!.role,
            joinedAt: r.vaultMembers!.joinedAt
        }));

    return {
        vaults: vaultData,
        vaultMembers: currentMembership,
        members
    };
};
