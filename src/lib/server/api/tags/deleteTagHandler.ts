import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import { expenseTags, expenseTagAssignments } from "$lib/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireVaultPermission } from "$lib/server/utils/vaultPermissions";
import { deleteAuditFields } from "$lib/server/utils/audit";
import type { DeleteTagRequest } from "$lib/schemas/tags";

export const deleteTag = async (
    session: App.AuthSession,
    data: DeleteTagRequest,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canDeleteExpenses', env);

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

    // Soft-delete the tag and hard-delete its assignments. Assignments are
    // pure relational data with no audit value once the tag is gone.
    await client.batch([
        client
            .update(expenseTags)
            .set(deleteAuditFields({ userId: session.user.id }))
            .where(eq(expenseTags.id, data.id)),
        client
            .delete(expenseTagAssignments)
            .where(eq(expenseTagAssignments.tagId, data.id)),
    ]);

    return { id: data.id };
};
