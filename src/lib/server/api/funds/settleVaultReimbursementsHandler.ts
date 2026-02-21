import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundTransactions, expenses } from '$lib/server/db/schema';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import { updateAuditFields } from '$lib/server/utils/audit';
import { getActiveCycleOrCreate } from './getActiveCycleOrCreate';
import { formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import type { SettleVaultReimbursements } from '$lib/schemas/funds';

export const settleVaultReimbursements = async (
    session: App.AuthSession,
    data: SettleVaultReimbursements,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canManageFunds', env);
    await requireVaultEntitlement(session, data.vaultId, 'fund:cross_fund_reimbursement', env);

    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;
    const now = formatISO(new UTCDate());

    // Fetch all requested pending transactions, joined with expenses and funds.
    // The funds join also scopes to the vault — only funds in this vault match.
    const rows = await client
        .select({ transaction: fundTransactions, expense: expenses, fund: funds })
        .from(fundTransactions)
        .innerJoin(expenses, eq(fundTransactions.expenseId, expenses.id))
        .innerJoin(funds, eq(fundTransactions.fundId, funds.id))
        .where(
            and(
                inArray(fundTransactions.id, data.fundTransactionIds),
                eq(funds.vaultId, data.vaultId),
                eq(fundTransactions.type, 'pending_reimbursement'),
                isNull(expenses.deletedAt),
                isNull(funds.deletedAt),
            ),
        );

    if (rows.length !== data.fundTransactionIds.length) {
        throw new Error(
            'Some transactions were not found, are not pending reimbursements, or do not belong to this vault',
        );
    }

    // ── Group by fund ─────────────────────────────────────────────────────
    type FundGroup = {
        fund: typeof rows[0]['fund'];
        rows: typeof rows;
        total: number;
        cycleId: string;
    };

    const grouped = new Map<string, FundGroup>();

    for (const row of rows) {
        const existing = grouped.get(row.fund.id);
        if (existing) {
            existing.rows.push(row);
            existing.total += row.expense.amount;
        } else {
            grouped.set(row.fund.id, { fund: row.fund, rows: [row], total: row.expense.amount, cycleId: '' });
        }
    }

    // ── Pre-validate all funds and resolve active cycles ──────────────────
    // Cycle resolution happens before the batch because lazy rollover may write.
    const fundErrors: string[] = [];

    for (const [fundId, group] of grouped) {
        if (group.fund.balance < group.total) {
            fundErrors.push(
                `Fund "${group.fund.name}" has insufficient balance. Available: ${group.fund.balance}, required: ${group.total}`,
            );
        }

        const cycle = await getActiveCycleOrCreate(fundId, userId, env);
        group.cycleId = cycle.id;
    }

    if (fundErrors.length > 0) {
        throw new Error(`Balance validation failed:\n${fundErrors.join('\n')}`);
    }

    // ── Build all statements and execute atomically via D1 batch ──────────
    const statements: ReturnType<typeof client.update>[] = [];

    for (const [fundId, group] of grouped) {
        for (const { transaction, expense } of group.rows) {
            statements.push(
                client
                    .update(fundTransactions)
                    .set({
                        type: 'reimbursement',
                        amount: expense.amount,
                        reimbursedAt: now,
                        reimbursedBy: userId,
                        ...updateAuditFields({ userId }),
                    })
                    .where(eq(fundTransactions.id, transaction.id)),
            );
        }

        statements.push(
            client
                .update(funds)
                .set({
                    balance: sql`${funds.balance} - ${group.total}`,
                    ...updateAuditFields({ userId }),
                })
                .where(eq(funds.id, fundId)),
        );

        statements.push(
            client
                .update(fundCycles)
                .set({
                    totalReimbursed: sql`${fundCycles.totalReimbursed} + ${group.total}`,
                    ...updateAuditFields({ userId }),
                })
                .where(eq(fundCycles.id, group.cycleId)),
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.batch(statements as any);

    const byFund = Array.from(grouped.values()).map(g => ({
        fundId: g.fund.id,
        fundName: g.fund.name,
        settled: g.rows.length,
        amount: g.total,
    }));

    return {
        settled: rows.length,
        totalAmount: rows.reduce((sum, r) => sum + r.expense.amount, 0),
        byFund,
    };
};
