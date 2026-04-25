import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {vaults, vaultMembers} from "$lib/server/db/schema";
import * as authSchema from "$lib/server/db/better-auth-schema";
import { user as authUser } from "$lib/server/db/better-auth-schema";
import {and, eq, inArray, isNull } from "drizzle-orm";

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
    const baseMembers = results
        .filter(r => r.vaultMembers && r.vaultMembers.status === 'active')
        .map(r => ({
            userId: r.vaultMembers!.userId,
            displayName: r.vaultMembers!.displayName || r.vaultMembers!.userId,
            role: r.vaultMembers!.role,
            joinedAt: r.vaultMembers!.joinedAt,
        }));

    // Hydrate avatar URLs from the auth DB. Vault member counts are typically
    // small (<20), so a single IN(...) query is fine. If we ever scale members
    // past ~80, switch to chunking like getExpensesHandler does.
    const memberImages = new Map<string, string | null>();
    if (baseMembers.length > 0) {
        try {
            const authClient = drizzle(env.AUTH_DB, { schema: authSchema });
            const rows = await authClient
                .select({ id: authUser.id, image: authUser.image })
                .from(authUser)
                .where(inArray(authUser.id, baseMembers.map((m) => m.userId)));
            for (const row of rows) memberImages.set(row.id, row.image ?? null);
        } catch (err) {
            // Avatar lookup is non-critical — fall back to initial-letter rendering.
            console.error('Failed to fetch member avatars:', err);
        }
    }

    const members = baseMembers.map((m) => ({
        ...m,
        image: memberImages.get(m.userId) ?? null,
    }));

    return {
        vaults: vaultData,
        vaultMembers: currentMembership,
        members
    };
};
