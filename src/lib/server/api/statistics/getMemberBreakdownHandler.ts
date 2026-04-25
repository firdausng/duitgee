import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses, vaultMembers } from '$lib/server/db/schema';
import { and, eq, isNull, sql, desc } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import { checkVaultEntitlement } from '$lib/server/utils/entitlements';
import { clampHistoryForFree, defaultRange } from './helpers';
import type { MemberBreakdownQuery, MemberBreakdownItem } from '$lib/schemas/statistics';

export const getMemberBreakdown = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: MemberBreakdownQuery,
): Promise<MemberBreakdownItem[]> => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    const { start: defaultStart, end: defaultEnd } = defaultRange();
    const requestedStart = query.start ?? defaultStart;
    const end = query.end ?? defaultEnd;
    const { start: clampedStart } = await clampHistoryForFree(vaultId, requestedStart, env);
    const start = clampedStart ?? defaultStart;

    const client = drizzle(env.DB, { schema });

    const rows = await client
        .select({
            userId: expenses.paidBy,
            displayName: vaultMembers.displayName,
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
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
                isNull(expenses.deletedAt),
                sql`${expenses.date} >= ${start}`,
                sql`${expenses.date} <= ${end}`,
            ),
        )
        .groupBy(expenses.paidBy, vaultMembers.displayName)
        .orderBy(desc(sql`COALESCE(SUM(${expenses.amount}), 0)`));

    const items: MemberBreakdownItem[] = rows.map((r) => ({
        userId: r.userId,
        displayName: r.displayName ?? (r.userId ? 'Unknown member' : 'Vault-level expense'),
        totalAmount: r.totalAmount,
        count: r.count,
    }));

    // Net-position math is Pro-only. Free callers get totals only.
    if (query.includeNetPosition) {
        const allowed = await checkVaultEntitlement(vaultId, 'stats:advanced_breakdowns', env);
        if (allowed) {
            // Fair-share assumption: total / active member count, evenly split.
            // Vault-level expenses (paidBy=null) are counted in the pool but
            // don't reduce anyone's "paid" — they belong to the vault, not a
            // member. Members shoulder the share.
            const memberRows = await client
                .select({ userId: vaultMembers.userId })
                .from(vaultMembers)
                .where(
                    and(
                        eq(vaultMembers.vaultId, vaultId),
                        eq(vaultMembers.status, 'active'),
                    ),
                );
            const activeMemberCount = memberRows.length || 1;

            const totalSpent = items.reduce((sum, it) => sum + it.totalAmount, 0);
            const expectedShare = totalSpent / activeMemberCount;

            for (const it of items) {
                if (!it.userId) continue; // skip vault-level row from net math
                it.expectedShare = expectedShare;
                it.net = it.totalAmount - expectedShare;
            }
        }
    }

    return items;
};
