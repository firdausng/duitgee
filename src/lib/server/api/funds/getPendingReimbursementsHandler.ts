import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import * as authSchema from '$lib/server/db/better-auth-schema';
import { funds, fundTransactions, expenses } from '$lib/server/db/schema';
import { user } from '$lib/server/db/better-auth-schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';

export const getPendingReimbursements = async (
    fundId: string,
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
) => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('Permission denied: not a member of this vault');

    const client = drizzle(env.DB, { schema });

    // Verify fund belongs to vault
    const [fund] = await client
        .select({ id: funds.id, name: funds.name, balance: funds.balance })
        .from(funds)
        .where(and(eq(funds.id, fundId), eq(funds.vaultId, vaultId), isNull(funds.deletedAt)))
        .limit(1);

    if (!fund) throw new Error('Fund not found');

    const rows = await client
        .select({ transaction: fundTransactions, expense: expenses })
        .from(fundTransactions)
        .innerJoin(expenses, eq(fundTransactions.expenseId, expenses.id))
        .where(
            and(
                eq(fundTransactions.fundId, fundId),
                eq(fundTransactions.type, 'pending_reimbursement'),
                isNull(expenses.deletedAt),
            ),
        )
        .orderBy(expenses.date);

    // Resolve paidBy user names from auth DB
    const paidByIds = [...new Set(rows.map((r) => r.expense.paidBy).filter(Boolean))] as string[];
    const userMap = new Map<string, string>();
    if (paidByIds.length > 0) {
        const authClient = drizzle(env.AUTH_DB, { schema: authSchema });
        const users = await authClient
            .select({ id: user.id, name: user.name })
            .from(user)
            .where(inArray(user.id, paidByIds));
        for (const u of users) userMap.set(u.id, u.name);
    }

    const pendingReimbursements = rows.map((r) => ({
        transaction: r.transaction,
        expense: {
            ...r.expense,
            paidByName: r.expense.paidBy ? (userMap.get(r.expense.paidBy) ?? null) : null,
        },
    }));

    return { fund, pendingReimbursements };
};
