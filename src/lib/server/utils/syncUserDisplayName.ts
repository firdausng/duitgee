import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import { vaultMembers } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Sync user's display name across all their vault memberships
 * This should be called whenever a user updates their name in their profile
 */
export const syncUserDisplayName = async (
	userId: string,
	newDisplayName: string,
	env: Cloudflare.Env
) => {
	const client = drizzle(env.DB, { schema });

	// Update all vault member records for this user
	const updatedMembers = await client
		.update(vaultMembers)
		.set({
			displayName: newDisplayName
		})
		.where(eq(vaultMembers.userId, userId))
		.returning();

	return {
		count: updatedMembers.length,
		members: updatedMembers
	};
};
