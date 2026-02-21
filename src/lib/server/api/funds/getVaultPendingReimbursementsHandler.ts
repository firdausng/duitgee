import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundTransactions, expenses } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';

export const getVaultPendingReimbursements = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
) => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('Permission denied: not a member of this vault');

    await requireVaultEntitlement(session, vaultId, 'fund:cross_fund_reimbursement', env);

    const client = drizzle(env.DB, { schema });

    const rows = await client
        .select({
            transaction: fundTransactions,
            expense: expenses,
            fund: {
                id: funds.id,
                name: funds.name,
                balance: funds.balance,
                color: funds.color,
                icon: funds.icon,
                iconType: funds.iconType,
            },
        })
        .from(fundTransactions)
        .innerJoin(expenses, eq(fundTransactions.expenseId, expenses.id))
        .innerJoin(funds, eq(fundTransactions.fundId, funds.id))
        .where(
            and(
                eq(funds.vaultId, vaultId),
                eq(fundTransactions.type, 'pending_reimbursement'),
                isNull(expenses.deletedAt),
                isNull(funds.deletedAt),
            ),
        )
        .orderBy(funds.name, expenses.date);

    return rows;
};
