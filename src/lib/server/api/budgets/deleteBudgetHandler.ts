import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {DeleteBudgetRequest} from "$lib/schemas/budgets";
import {budgets} from "$lib/server/db/schema";
import {and, eq, isNull} from "drizzle-orm";
import {requireVaultPermission} from "$lib/server/utils/vaultPermissions";
import {deleteAuditFields} from "$lib/server/utils/audit";

export const deleteBudget = async (
    session: App.AuthSession,
    data: DeleteBudgetRequest,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    if(session.user.role !== 'admin'){
        // Check permission - only owner/admin can delete budgets
        await requireVaultPermission(session, data.vaultId, 'canEditVault', env);
    }

    // Check if budget exists
    const [existingBudget] = await client
        .select()
        .from(budgets)
        .where(and(
            eq(budgets.id, data.id),
            eq(budgets.vaultId, data.vaultId),
            isNull(budgets.deletedAt)
        ))
        .limit(1);

    if (!existingBudget) {
        throw new Error('Budget not found');
    }

    // Soft delete - mark as deleted with audit fields
    const [deletedBudget] = await client
        .update(budgets)
        .set({
            ...deleteAuditFields({ userId: session.user.id })
        })
        .where(eq(budgets.id, data.id))
        .returning();

    return deletedBudget;
};
