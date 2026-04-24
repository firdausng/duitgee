import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    recurringExpenses,
    expenseTemplates,
    expenses,
    pendingRecurringOccurrences,
} from '$lib/server/db/schema';
import { and, desc, eq, isNull, sql, count, sum, inArray } from 'drizzle-orm';
import { parseISO, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { processDueRecurringExpenses } from './processDueRecurringExpenses';
import {
    computeFinalOccurrence,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import type { GetRecurringExpensesQuery } from '$lib/schemas/recurringExpenses';

export const getRecurringExpenses = async (
    session: App.AuthSession,
    query: GetRecurringExpensesQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canManageRecurring', env);

    // Lazy catch-up before reading, so the list reflects any occurrences we owe.
    await processDueRecurringExpenses(env, { vaultId: query.vaultId });

    const client = drizzle(env.DB, { schema });

    const conditions = [
        eq(recurringExpenses.vaultId, query.vaultId),
        isNull(recurringExpenses.deletedAt),
    ];
    if (query.status) conditions.push(eq(recurringExpenses.status, query.status));

    const rows = await client
        .select({
            rule: recurringExpenses,
            templateName: expenseTemplates.name,
            templateIcon: expenseTemplates.icon,
            templateDefaultAmount: expenseTemplates.defaultAmount,
            templateDefaultCategory: expenseTemplates.defaultCategoryName,
        })
        .from(recurringExpenses)
        .leftJoin(expenseTemplates, eq(recurringExpenses.templateId, expenseTemplates.id))
        .where(and(...conditions))
        .orderBy(desc(recurringExpenses.createdAt));

    const ruleIds = rows.map((r) => r.rule.id);

    // Paid aggregates — real expenses linked to each rule (skipped items don't count).
    const paidMap = new Map<string, { count: number; amount: number }>();
    if (ruleIds.length > 0) {
        const paidRows = await client
            .select({
                ruleId: expenses.recurringExpenseId,
                c: count(),
                amt: sum(expenses.amount),
            })
            .from(expenses)
            .where(
                and(
                    inArray(expenses.recurringExpenseId, ruleIds),
                    isNull(expenses.deletedAt),
                ),
            )
            .groupBy(expenses.recurringExpenseId);
        for (const p of paidRows) {
            if (p.ruleId) {
                paidMap.set(p.ruleId, {
                    count: Number(p.c ?? 0),
                    amount: Number(p.amt ?? 0),
                });
            }
        }
    }

    // Pending queue-mode occurrences per rule.
    const pendingMap = new Map<string, number>();
    if (ruleIds.length > 0) {
        const pendingRows = await client
            .select({
                ruleId: pendingRecurringOccurrences.recurringExpenseId,
                c: count(),
            })
            .from(pendingRecurringOccurrences)
            .where(
                and(
                    inArray(pendingRecurringOccurrences.recurringExpenseId, ruleIds),
                    eq(pendingRecurringOccurrences.status, 'pending'),
                ),
            )
            .groupBy(pendingRecurringOccurrences.recurringExpenseId);
        for (const p of pendingRows) {
            if (p.ruleId) pendingMap.set(p.ruleId, Number(p.c ?? 0));
        }
    }

    return rows.map((r) => {
        const paid = paidMap.get(r.rule.id) ?? { count: 0, amount: 0 };
        const pendingCount = pendingMap.get(r.rule.id) ?? 0;

        const amount = r.rule.amountOverride ?? r.templateDefaultAmount ?? 0;
        const totalAmount =
            r.rule.endAfterCount !== null ? amount * r.rule.endAfterCount : null;

        // Installment end date — derived from anchor + (count - 1) * interval.
        let finalOccurrenceAt: string | null = null;
        if (r.rule.endAfterCount !== null) {
            const anchor = parseISO(r.rule.anchorDate);
            const final = computeFinalOccurrence(
                anchor,
                r.rule.scheduleUnit as ScheduleUnit,
                r.rule.scheduleInterval,
                r.rule.endAfterCount,
            );
            finalOccurrenceAt = formatISO(new UTCDate(final));
        }

        return {
            ...r.rule,
            template: {
                name: r.templateName,
                icon: r.templateIcon,
                defaultAmount: r.templateDefaultAmount,
                defaultCategoryName: r.templateDefaultCategory,
            },
            progress: {
                paidCount: paid.count,
                paidAmount: paid.amount,
                pendingCount,
                totalAmount,
                finalOccurrenceAt,
            },
        };
    });
};
