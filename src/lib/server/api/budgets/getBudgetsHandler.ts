import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {GetBudgetsQuery} from "$lib/schemas/budgets";
import {budgets} from "$lib/server/db/schema";
import {and, eq, isNull} from "drizzle-orm";
import {getUserVaultRole} from "$lib/server/utils/vaultPermissions";

export const getBudgets = async (
    session: App.AuthSession,
    query: GetBudgetsQuery,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    // Check if user has access to vault
    const role = await getUserVaultRole(session.user.id, query.vaultId, env);
    if (!role) {
        throw new Error('You do not have access to this vault');
    }

    // Build query filters
    const filters = [
        eq(budgets.vaultId, query.vaultId),
        isNull(budgets.deletedAt)
    ];

    // Filter by active status if specified
    if (query.isActive !== undefined) {
        filters.push(eq(budgets.isActive, query.isActive));
    }

    // Filter by category if specified
    if (query.categoryName) {
        filters.push(eq(budgets.categoryName, query.categoryName));
    }

    // Filter by user if specified
    if (query.userId) {
        filters.push(eq(budgets.userId, query.userId));
    }

    // Get budgets
    const vaultBudgets = await client
        .select()
        .from(budgets)
        .where(and(...filters))
        .orderBy(budgets.createdAt);

    return vaultBudgets;
};
