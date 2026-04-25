import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import { expenseTags } from "$lib/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireVaultPermission } from "$lib/server/utils/vaultPermissions";
import { initialAuditFields } from "$lib/server/utils/audit";
import type { CreateTagRequest } from "$lib/schemas/tags";

export const createTag = async (
    session: App.AuthSession,
    data: CreateTagRequest,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canEditExpenses', env);

    const client = drizzle(env.DB, { schema });

    const trimmed = data.name.trim();

    // Reject duplicate name in same vault
    const existing = await client
        .select({ id: expenseTags.id })
        .from(expenseTags)
        .where(and(
            eq(expenseTags.vaultId, data.vaultId),
            eq(expenseTags.name, trimmed),
            isNull(expenseTags.deletedAt),
        ))
        .limit(1);

    if (existing.length > 0) {
        throw new Error('A tag with this name already exists in this vault');
    }

    const [tag] = await client
        .insert(expenseTags)
        .values({
            vaultId: data.vaultId,
            name: trimmed,
            color: data.color ?? null,
            isSystem: false,
            ...initialAuditFields({ userId: session.user.id }),
        })
        .returning();

    return tag;
};
