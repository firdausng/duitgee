import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import { expenseTags } from "$lib/server/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";
import { requireVaultPermission } from "$lib/server/utils/vaultPermissions";
import { updateAuditFields } from "$lib/server/utils/audit";
import type { UpdateTagRequest } from "$lib/schemas/tags";

export const updateTag = async (
    session: App.AuthSession,
    data: UpdateTagRequest,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canEditExpenses', env);

    const client = drizzle(env.DB, { schema });

    const existing = await client
        .select()
        .from(expenseTags)
        .where(and(
            eq(expenseTags.id, data.id),
            eq(expenseTags.vaultId, data.vaultId),
            isNull(expenseTags.deletedAt),
        ))
        .limit(1);

    if (existing.length === 0) {
        throw new Error('Tag not found');
    }

    const updates: Partial<typeof expenseTags.$inferInsert> = {
        ...updateAuditFields({ userId: session.user.id }),
    };

    if (data.name !== undefined) {
        const trimmed = data.name.trim();
        // Check for name collision (excluding the tag being updated)
        const collision = await client
            .select({ id: expenseTags.id })
            .from(expenseTags)
            .where(and(
                eq(expenseTags.vaultId, data.vaultId),
                eq(expenseTags.name, trimmed),
                ne(expenseTags.id, data.id),
                isNull(expenseTags.deletedAt),
            ))
            .limit(1);

        if (collision.length > 0) {
            throw new Error('A tag with this name already exists in this vault');
        }

        updates.name = trimmed;
    }

    if (data.color !== undefined) {
        updates.color = data.color;
    }

    const [updated] = await client
        .update(expenseTags)
        .set(updates)
        .where(eq(expenseTags.id, data.id))
        .returning();

    return updated;
};
