import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundTransactions, fundTransfers } from '$lib/server/db/schema';
import { eq, and, isNull, desc, inArray, sql } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';

export const getFundTransactions = async (
    vaultId: string,
    fundId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    options?: { page?: number; limit?: number; types?: string[] },
) => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('Permission denied: not a member of this vault');

    const { page = 1, limit = 30, types } = options ?? {};
    const offset = (page - 1) * limit;

    const client = drizzle(env.DB, { schema });

    // Verify fund belongs to vault
    const [fund] = await client
        .select({ id: funds.id })
        .from(funds)
        .where(and(eq(funds.id, fundId), eq(funds.vaultId, vaultId), isNull(funds.deletedAt)))
        .limit(1);
    if (!fund) throw new Error('Fund not found');

    // Build where clause
    let whereClause: ReturnType<typeof eq> | ReturnType<typeof and> = eq(fundTransactions.fundId, fundId);
    if (types && types.length > 0) {
        whereClause = and(whereClause, inArray(fundTransactions.type, types)) as ReturnType<typeof and>;
    }

    // Fetch rows with transfer join
    const rows = await client
        .select({
            id: fundTransactions.id,
            type: fundTransactions.type,
            amount: fundTransactions.amount,
            note: fundTransactions.note,
            expenseId: fundTransactions.expenseId,
            fundTransferId: fundTransactions.fundTransferId,
            createdAt: fundTransactions.createdAt,
            fromFundId: fundTransfers.fromFundId,
            toFundId: fundTransfers.toFundId,
        })
        .from(fundTransactions)
        .leftJoin(fundTransfers, eq(fundTransactions.fundTransferId, fundTransfers.id))
        .where(whereClause)
        .orderBy(desc(fundTransactions.createdAt))
        .limit(limit)
        .offset(offset);

    // Resolve other fund names for transfer transactions
    const otherFundIds = [
        ...new Set(
            rows.flatMap((r) => {
                if (r.type === 'transfer_in' && r.fromFundId) return [r.fromFundId];
                if (r.type === 'transfer_out' && r.toFundId) return [r.toFundId];
                return [];
            }),
        ),
    ];

    const fundNameMap = new Map<string, string>();
    if (otherFundIds.length > 0) {
        const otherFunds = await client
            .select({ id: funds.id, name: funds.name })
            .from(funds)
            .where(inArray(funds.id, otherFundIds));
        for (const f of otherFunds) fundNameMap.set(f.id, f.name);
    }

    // Total count
    const [{ count }] = await client
        .select({ count: sql<number>`count(*)` })
        .from(fundTransactions)
        .where(whereClause);

    return {
        transactions: rows.map((r) => ({
            id: r.id,
            type: r.type,
            amount: r.amount,
            note: r.note,
            expenseId: r.expenseId,
            fundTransferId: r.fundTransferId,
            createdAt: r.createdAt,
            otherFundName:
                r.type === 'transfer_in' && r.fromFundId
                    ? (fundNameMap.get(r.fromFundId) ?? null)
                    : r.type === 'transfer_out' && r.toFundId
                      ? (fundNameMap.get(r.toFundId) ?? null)
                      : null,
        })),
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    };
};
