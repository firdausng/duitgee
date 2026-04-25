import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses, vaultMembers } from '$lib/server/db/schema';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';

export interface UnidentifiedExpenseSummary {
    id: string;
    amount: number;
    date: string;
    paidBy: string | null;
    paidByName: string | null;
    createdAt: string;
}

/**
 * Lightweight query for the dashboard widget. Returns the most recent
 * unidentified expenses + the totals across all of them.
 */
export const getUnidentifiedExpenses = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    limit = 5,
): Promise<{ items: UnidentifiedExpenseSummary[]; count: number; totalAmount: number }> => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    const client = drizzle(env.DB, { schema });

    const items = await client
        .select({
            id: expenses.id,
            amount: expenses.amount,
            date: expenses.date,
            paidBy: expenses.paidBy,
            paidByName: vaultMembers.displayName,
            createdAt: expenses.createdAt,
        })
        .from(expenses)
        .leftJoin(
            vaultMembers,
            and(
                eq(expenses.vaultId, vaultMembers.vaultId),
                eq(expenses.paidBy, vaultMembers.userId),
            ),
        )
        .where(
            and(
                eq(expenses.vaultId, vaultId),
                eq(expenses.status, 'unidentified'),
                isNull(expenses.deletedAt),
            ),
        )
        .orderBy(desc(expenses.createdAt))
        .limit(Math.max(1, Math.min(limit, 50)));

    const [totals] = await client
        .select({
            count: sql<number>`COUNT(*)`,
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
            and(
                eq(expenses.vaultId, vaultId),
                eq(expenses.status, 'unidentified'),
                isNull(expenses.deletedAt),
            ),
        );

    return {
        items: items.map((r) => ({
            id: r.id,
            amount: r.amount,
            date: r.date ?? '',
            paidBy: r.paidBy,
            paidByName: r.paidByName,
            createdAt: r.createdAt ?? '',
        })),
        count: totals?.count ?? 0,
        totalAmount: totals?.totalAmount ?? 0,
    };
};
