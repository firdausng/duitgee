import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringExpenses, expenseTemplates } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { parseISO, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import {
    computeNextOccurrence,
    isScheduleExhausted,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import type { GetUpcomingOccurrencesQuery } from '$lib/schemas/recurringExpenses';

export interface UpcomingOccurrence {
    ruleId: string;
    ruleName: string | null;
    templateName: string | null;
    templateIcon: string | null;
    generationMode: string;
    amount: number;
    dueDate: string;
}

/**
 * Project upcoming occurrences for active rules over the next N days.
 * Read-only — does not advance any rule state.
 */
export const getUpcomingOccurrences = async (
    session: App.AuthSession,
    query: GetUpcomingOccurrencesQuery,
    env: Cloudflare.Env,
): Promise<UpcomingOccurrence[]> => {
    await requireVaultPermission(session, query.vaultId, 'canManageRecurring', env);

    const client = drizzle(env.DB, { schema });
    const now = new UTCDate();
    const horizonMs = now.getTime() + query.days * 24 * 60 * 60 * 1000;

    const rows = await client
        .select({
            rule: recurringExpenses,
            templateName: expenseTemplates.name,
            templateIcon: expenseTemplates.icon,
            templateDefaultAmount: expenseTemplates.defaultAmount,
        })
        .from(recurringExpenses)
        .leftJoin(expenseTemplates, eq(recurringExpenses.templateId, expenseTemplates.id))
        .where(
            and(
                eq(recurringExpenses.vaultId, query.vaultId),
                eq(recurringExpenses.status, 'active'),
                isNull(recurringExpenses.deletedAt),
            ),
        );

    const results: UpcomingOccurrence[] = [];

    for (const row of rows) {
        if (!row.rule.nextOccurrenceAt) continue;

        const amount = row.rule.amountOverride ?? row.templateDefaultAmount ?? 0;
        if (amount <= 0) continue;

        let currentIso = row.rule.nextOccurrenceAt;
        let occurrenceCount = row.rule.occurrenceCount;
        const anchor = parseISO(row.rule.anchorDate);
        const endDateParsed = row.rule.endDate ? parseISO(row.rule.endDate) : null;

        let safety = 30;
        while (safety-- > 0) {
            const currentDate = parseISO(currentIso);
            if (currentDate.getTime() > horizonMs) break;

            results.push({
                ruleId: row.rule.id,
                ruleName: row.rule.name,
                templateName: row.templateName,
                templateIcon: row.templateIcon,
                generationMode: row.rule.generationMode,
                amount,
                dueDate: currentIso,
            });

            const nextDate = computeNextOccurrence(
                anchor,
                row.rule.scheduleUnit as ScheduleUnit,
                row.rule.scheduleInterval,
                currentDate,
            );
            occurrenceCount++;
            if (
                isScheduleExhausted({
                    occurrenceCount,
                    endAfterCount: row.rule.endAfterCount,
                    endDate: endDateParsed,
                    nextOccurrenceAt: nextDate,
                })
            ) {
                break;
            }
            currentIso = formatISO(new UTCDate(nextDate));
        }
    }

    return results.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};
