import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses, vaultMembers } from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { addDays, subDays, formatISO } from 'date-fns';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import {
    DUPLICATE_MATCH_WINDOW_DAYS,
    type FindUnidentifiedDuplicatesQuery,
    type UnidentifiedDuplicateMatch,
} from '$lib/schemas/unidentifiedExpenses';

const AMOUNT_EPSILON = 0.005;

export const findUnidentifiedDuplicates = async (
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: FindUnidentifiedDuplicatesQuery,
): Promise<UnidentifiedDuplicateMatch[]> => {
    const role = await getUserVaultRole(session.user.id, query.vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    if (!Number.isFinite(query.amount) || query.amount <= 0) return [];

    const target = new Date(query.date);
    if (isNaN(target.getTime())) return [];

    const windowStart = formatISO(subDays(target, DUPLICATE_MATCH_WINDOW_DAYS));
    const windowEnd = formatISO(addDays(target, DUPLICATE_MATCH_WINDOW_DAYS));

    const client = drizzle(env.DB, { schema });

    const rows = await client
        .select({
            id: expenses.id,
            amount: expenses.amount,
            date: expenses.date,
            paidBy: expenses.paidBy,
            paidByName: vaultMembers.displayName,
            createdAt: expenses.createdAt,
            createdBy: expenses.createdBy,
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
                eq(expenses.vaultId, query.vaultId),
                eq(expenses.status, 'unidentified'),
                isNull(expenses.deletedAt),
                sql`ABS(${expenses.amount} - ${query.amount}) < ${AMOUNT_EPSILON}`,
                sql`${expenses.date} >= ${windowStart}`,
                sql`${expenses.date} <= ${windowEnd}`,
            ),
        )
        .limit(5);

    return rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        date: r.date ?? '',
        paidBy: r.paidBy,
        paidByName: r.paidByName,
        createdAt: r.createdAt ?? '',
        createdBy: r.createdBy,
    }));
};
