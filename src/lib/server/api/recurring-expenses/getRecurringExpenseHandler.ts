import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    recurringExpenses,
    expenseTemplates,
    expenses,
    pendingRecurringOccurrences,
} from '$lib/server/db/schema';
import { and, eq, isNull, count, sum } from 'drizzle-orm';
import { parseISO, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { processDueRecurringExpenses } from './processDueRecurringExpenses';
import {
    computeFinalOccurrence,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import type { GetRecurringExpenseQuery } from '$lib/schemas/recurringExpenses';

export const getRecurringExpense = async (
    session: App.AuthSession,
    query: GetRecurringExpenseQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canManageRecurring', env);
    await processDueRecurringExpenses(env, { vaultId: query.vaultId, ruleId: query.id });

    const client = drizzle(env.DB, { schema });

    const [row] = await client
        .select({
            rule: recurringExpenses,
            templateName: expenseTemplates.name,
            templateIcon: expenseTemplates.icon,
            templateDefaultAmount: expenseTemplates.defaultAmount,
            templateDefaultCategory: expenseTemplates.defaultCategoryName,
            templateDefaultNote: expenseTemplates.defaultNote,
            templateDefaultPaymentType: expenseTemplates.defaultPaymentType,
            templateDefaultPaidBy: expenseTemplates.defaultPaidBy,
            templateDefaultFundId: expenseTemplates.defaultFundId,
            templateDefaultFundPaymentMode: expenseTemplates.defaultFundPaymentMode,
        })
        .from(recurringExpenses)
        .leftJoin(expenseTemplates, eq(recurringExpenses.templateId, expenseTemplates.id))
        .where(
            and(
                eq(recurringExpenses.id, query.id),
                eq(recurringExpenses.vaultId, query.vaultId),
                isNull(recurringExpenses.deletedAt),
            ),
        )
        .limit(1);

    if (!row) return null;

    const [paidAgg] = await client
        .select({ c: count(), amt: sum(expenses.amount) })
        .from(expenses)
        .where(
            and(
                eq(expenses.recurringExpenseId, query.id),
                isNull(expenses.deletedAt),
            ),
        );

    const [pendingAgg] = await client
        .select({ c: count() })
        .from(pendingRecurringOccurrences)
        .where(
            and(
                eq(pendingRecurringOccurrences.recurringExpenseId, query.id),
                eq(pendingRecurringOccurrences.status, 'pending'),
            ),
        );

    const amount = row.rule.amountOverride ?? row.templateDefaultAmount ?? 0;
    const totalAmount =
        row.rule.endAfterCount !== null ? amount * row.rule.endAfterCount : null;

    let finalOccurrenceAt: string | null = null;
    if (row.rule.endAfterCount !== null) {
        const anchor = parseISO(row.rule.anchorDate);
        const final = computeFinalOccurrence(
            anchor,
            row.rule.scheduleUnit as ScheduleUnit,
            row.rule.scheduleInterval,
            row.rule.endAfterCount,
        );
        finalOccurrenceAt = formatISO(new UTCDate(final));
    }

    return {
        ...row.rule,
        template: {
            name: row.templateName,
            icon: row.templateIcon,
            defaultAmount: row.templateDefaultAmount,
            defaultCategoryName: row.templateDefaultCategory,
            defaultNote: row.templateDefaultNote,
            defaultPaymentType: row.templateDefaultPaymentType,
            defaultPaidBy: row.templateDefaultPaidBy,
            defaultFundId: row.templateDefaultFundId,
            defaultFundPaymentMode: row.templateDefaultFundPaymentMode,
        },
        progress: {
            paidCount: Number(paidAgg?.c ?? 0),
            paidAmount: Number(paidAgg?.amt ?? 0),
            pendingCount: Number(pendingAgg?.c ?? 0),
            totalAmount,
            finalOccurrenceAt,
        },
    };
};
