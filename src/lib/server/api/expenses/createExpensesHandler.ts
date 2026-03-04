import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import type { CreateExpensesRequest } from '$lib/schemas/expenses';
import { createId } from '@paralleldrive/cuid2';
import { categoryData } from '$lib/configurations/categories';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { expenses, expenseTemplates, funds, fundCycles, fundTransactions } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { getActiveCycleOrCreate } from '$lib/server/api/funds/getActiveCycleOrCreate';

interface ResolvedItem {
    expenseId: string;
    amount: number;
    categoryName: string;
    note: string | undefined;
    paymentType: string;
    date: string;
    paidBy: string | null;
    fundId: string | null;
    fundPaymentMode: string | null;
}

export const createExpenses = async (
    session: App.AuthSession,
    data: CreateExpensesRequest,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canCreateExpenses', env);

    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;
    const auditFields = initialAuditFields({ userId });

    // 1. Resolve effective fields for each item (item override ?? shared default)
    const resolvedItems: ResolvedItem[] = data.items.map((item) => ({
        expenseId: createId(),
        amount: item.amount,
        categoryName:
            categoryData.categories.find((c) => c.name === (item.categoryName))?.name ??
            item.categoryName,
        note: item.note,
        paymentType: item.paymentType ?? data.shared.paymentType,
        date: (() => {
            const raw = item.date ?? data.shared.date;
            return raw ? new Date(raw).toISOString() : new Date().toISOString();
        })(),
        paidBy: item.paidBy !== undefined ? item.paidBy : (data.shared.paidBy ?? null),
        fundId: item.fundId !== undefined ? item.fundId : (data.shared.fundId ?? null),
        fundPaymentMode:
            item.fundPaymentMode !== undefined
                ? item.fundPaymentMode
                : (data.shared.fundPaymentMode ?? null),
    }));

    // 2. Group fund-tagged items by fundId
    const fundGroups = new Map<string, ResolvedItem[]>();
    for (const item of resolvedItems) {
        if (item.fundId && item.fundPaymentMode) {
            const group = fundGroups.get(item.fundId) || [];
            group.push(item);
            fundGroups.set(item.fundId, group);
        }
    }

    // 3. Pre-validate funds and resolve active cycles (must run before batch — may trigger writes)
    const fundData = new Map<string, { fund: typeof funds.$inferSelect; cycle: typeof fundCycles.$inferSelect }>();
    for (const [fundId, items] of fundGroups) {
        const [fund] = await client.select().from(funds).where(eq(funds.id, fundId)).limit(1);
        if (!fund) throw new Error(`Fund not found: ${fundId}`);
        if (fund.vaultId !== data.vaultId) throw new Error('Fund does not belong to this vault');
        if (fund.status === 'archived') throw new Error(`Cannot tag expenses to archived fund "${fund.name}"`);

        const paidByFundTotal = items
            .filter((i) => i.fundPaymentMode === 'paid_by_fund')
            .reduce((sum, i) => sum + i.amount, 0);

        if (paidByFundTotal > fund.balance) {
            throw new Error(
                `Insufficient balance in fund "${fund.name}". Available: ${fund.balance}, required: ${paidByFundTotal}`,
            );
        }

        const cycle = await getActiveCycleOrCreate(fund.id, userId, env);
        fundData.set(fundId, { fund, cycle });
    }

    // 4. Build batch operations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchOps: any[] = [];
    const fundTxIds = new Map<string, string>(); // expenseId -> fundTransactionId

    // 4a. Fund transaction inserts (one per fund-tagged item)
    for (const item of resolvedItems) {
        if (item.fundId && item.fundPaymentMode) {
            const txId = createId();
            fundTxIds.set(item.expenseId, txId);
            const { cycle } = fundData.get(item.fundId)!;

            if (item.fundPaymentMode === 'paid_by_fund') {
                batchOps.push(
                    client.insert(fundTransactions).values({
                        id: txId,
                        fundId: item.fundId,
                        cycleId: cycle.id,
                        type: 'expense_paid',
                        amount: item.amount,
                        expenseId: item.expenseId,
                        ...auditFields,
                    }),
                );
            } else {
                // pending_reimbursement: placeholder with amount = 0, no balance change
                batchOps.push(
                    client.insert(fundTransactions).values({
                        id: txId,
                        fundId: item.fundId,
                        cycleId: cycle.id,
                        type: 'pending_reimbursement',
                        amount: 0,
                        expenseId: item.expenseId,
                        ...auditFields,
                    }),
                );
            }
        }
    }

    // 4b. Aggregated fund balance + cycle updates (one per fund, not per item)
    for (const [fundId, items] of fundGroups) {
        const paidByFundTotal = items
            .filter((i) => i.fundPaymentMode === 'paid_by_fund')
            .reduce((sum, i) => sum + i.amount, 0);

        if (paidByFundTotal > 0) {
            const { cycle } = fundData.get(fundId)!;
            batchOps.push(
                client
                    .update(funds)
                    .set({
                        balance: sql`${funds.balance} - ${paidByFundTotal}`,
                        ...updateAuditFields({ userId }),
                    })
                    .where(eq(funds.id, fundId)),
            );
            batchOps.push(
                client
                    .update(fundCycles)
                    .set({
                        totalSpent: sql`${fundCycles.totalSpent} + ${paidByFundTotal}`,
                        ...updateAuditFields({ userId }),
                    })
                    .where(eq(fundCycles.id, cycle.id)),
            );
        }
    }

    // 4c. Expense inserts
    for (const item of resolvedItems) {
        batchOps.push(
            client.insert(expenses).values({
                id: item.expenseId,
                note: item.note,
                amount: item.amount,
                categoryName: item.categoryName,
                paymentType: item.paymentType,
                date: item.date,
                paidBy: item.paidBy,
                vaultId: data.vaultId,
                expenseTemplateId: data.templateId ?? null,
                fundId: item.fundId,
                fundPaymentMode: item.fundPaymentMode,
                fundTransactionId: fundTxIds.get(item.expenseId) ?? null,
                ...auditFields,
            }),
        );
    }

    // 4d. Template usage update
    if (data.templateId) {
        batchOps.push(
            client
                .update(expenseTemplates)
                .set({
                    usageCount: sql`${expenseTemplates.usageCount} + ${data.items.length}`,
                    lastUsedAt: formatISO(new UTCDate()),
                })
                .where(eq(expenseTemplates.id, data.templateId)),
        );
    }

    // 5. Execute batch — atomic on D1
    await client.batch(batchOps as [typeof batchOps[0], ...typeof batchOps]);

    return {
        created: resolvedItems.length,
        expenseIds: resolvedItems.map((i) => i.expenseId),
    };
};
