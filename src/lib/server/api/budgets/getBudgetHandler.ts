import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {GetBudgetQuery} from "$lib/schemas/budgets";
import {budgets} from "$lib/server/db/schema";
import {and, eq, isNull} from "drizzle-orm";
import {getUserVaultRole} from "$lib/server/utils/vaultPermissions";

export const getBudget = async (
    session: App.AuthSession,
    query: GetBudgetQuery,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    // Check if user has access to vault
    const role = await getUserVaultRole(session.user.id, query.vaultId, env);
    if (!role) {
        throw new Error('You do not have access to this vault');
    }

    // Get budget
    const [budget] = await client
        .select()
        .from(budgets)
        .where(and(
            eq(budgets.id, query.id),
            eq(budgets.vaultId, query.vaultId),
            isNull(budgets.deletedAt)
        ))
        .limit(1);

    if (!budget) {
        throw new Error('Budget not found');
    }

    return budget;
};
