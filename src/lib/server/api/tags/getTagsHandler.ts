import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import { expenseTags } from "$lib/server/db/schema";
import { and, eq, isNull, asc } from "drizzle-orm";
import { requireVaultPermission } from "$lib/server/utils/vaultPermissions";

export const getTags = async (
    session: App.AuthSession,
    vaultId: string,
    env: Cloudflare.Env,
) => {
    // Any vault member can read tags. canCreateExpenses is granted to all roles.
    await requireVaultPermission(session, vaultId, 'canCreateExpenses', env);

    const client = drizzle(env.DB, { schema });

    return client
        .select()
        .from(expenseTags)
        .where(and(
            eq(expenseTags.vaultId, vaultId),
            isNull(expenseTags.deletedAt),
        ))
        .orderBy(asc(expenseTags.name));
};
