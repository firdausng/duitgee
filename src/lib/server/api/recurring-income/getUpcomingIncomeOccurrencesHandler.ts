import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringIncome, incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { parseISO, formatISO, addDays } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import {
    computeNextOccurrence,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import type { GetUpcomingIncomeOccurrencesQuery } from '$lib/schemas/recurringIncome';

export interface UpcomingIncomeOccurrence {
    ruleId: string;
    ruleName: string | null;
    templateName: string | null;
    templateIcon: string | null;
    dueDate: string;
    amount: number;
    generationMode: 'auto' | 'queue';
}

/**
 * Project the next N days of upcoming occurrences from active rules. Pure
 * read — does not generate anything.
 */
export const getUpcomingIncomeOccurrences = async (
    session: App.AuthSession,
    query: GetUpcomingIncomeOccurrencesQuery,
    env: Cloudflare.Env,
): Promise<UpcomingIncomeOccurrence[]> => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });
    const days = Math.max(1, Math.min(90, query.days ?? 7));

    const rules = await client
        .select({
            rule: recurringIncome,
            templateName: incomeTemplates.name,
            templateIcon: incomeTemplates.icon,
            templateDefaultAmount: incomeTemplates.defaultAmount,
        })
        .from(recurringIncome)
        .leftJoin(incomeTemplates, eq(recurringIncome.templateId, incomeTemplates.id))
        .where(
            and(
                eq(recurringIncome.vaultId, query.vaultId),
                eq(recurringIncome.status, 'active'),
                isNotNull(recurringIncome.nextOccurrenceAt),
                isNull(recurringIncome.deletedAt),
            ),
        );

    const now = new UTCDate();
    const horizon = addDays(now, days);

    const projected: UpcomingIncomeOccurrence[] = [];
    for (const { rule, templateName, templateIcon, templateDefaultAmount } of rules) {
        const anchor = parseISO(rule.anchorDate);
        let cursor = parseISO(rule.nextOccurrenceAt!);
        let safety = 50;
        while (safety-- > 0 && cursor.getTime() <= horizon.getTime()) {
            if (rule.endDate && cursor.getTime() > parseISO(rule.endDate).getTime()) break;
            projected.push({
                ruleId: rule.id,
                ruleName: rule.name,
                templateName,
                templateIcon,
                dueDate: formatISO(new UTCDate(cursor)),
                amount: rule.amountOverride ?? templateDefaultAmount ?? 0,
                generationMode: rule.generationMode as 'auto' | 'queue',
            });
            const next = computeNextOccurrence(
                anchor,
                rule.scheduleUnit as ScheduleUnit,
                rule.scheduleInterval,
                cursor,
            );
            if (next.getTime() <= cursor.getTime()) break;
            cursor = next;
        }
    }

    projected.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return projected;
};
