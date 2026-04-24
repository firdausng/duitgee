import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    recurringExpenses,
    pendingRecurringOccurrences,
    expenseTemplates,
    expenses,
    funds,
} from '$lib/server/db/schema';
import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm';
import { UTCDate } from '@date-fns/utc';
import { formatISO, parseISO } from 'date-fns';
import { createId } from '@paralleldrive/cuid2';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { attachFundToExpense } from '$lib/server/api/funds/fundExpenseHelpers';
import {
    computeNextOccurrence,
    isScheduleExhausted,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';

export const CRON_SYSTEM_USER_ID = 'system:cron';

const MAX_CATCHUP_PER_RULE = 50;

export interface ProcessDueRecurringExpensesOptions {
    now?: Date;
    vaultId?: string;
    ruleId?: string;
}

export interface ProcessDueRecurringExpensesResult {
    rulesProcessed: number;
    autoCreated: number;
    queued: number;
    ended: number;
    skipped: number;
    errors: Array<{ ruleId: string; message: string }>;
}

/**
 * Advance every due recurring rule. For each due occurrence:
 *  - `auto` rules create a real expense row (+ fund integration, falling back to
 *    pending_reimbursement when the fund can't cover the amount).
 *  - `queue` rules create a pendingRecurringOccurrences row for the user to approve.
 *
 * Idempotent: guarded by `nextOccurrenceAt <= now` + optimistic UPDATE-with-WHERE
 * so concurrent cron and lazy-catch-up calls cannot double-generate.
 */
export const processDueRecurringExpenses = async (
    env: Cloudflare.Env,
    options: ProcessDueRecurringExpensesOptions = {},
): Promise<ProcessDueRecurringExpensesResult> => {
    const client = drizzle(env.DB, { schema });
    const now = options.now ?? new UTCDate();
    const nowIso = formatISO(new UTCDate(now));

    const conditions = [
        eq(recurringExpenses.status, 'active'),
        isNotNull(recurringExpenses.nextOccurrenceAt),
        lte(recurringExpenses.nextOccurrenceAt, nowIso),
        isNull(recurringExpenses.deletedAt),
    ];
    if (options.vaultId) conditions.push(eq(recurringExpenses.vaultId, options.vaultId));
    if (options.ruleId) conditions.push(eq(recurringExpenses.id, options.ruleId));

    const dueRules = await client.select().from(recurringExpenses).where(and(...conditions));

    const result: ProcessDueRecurringExpensesResult = {
        rulesProcessed: 0,
        autoCreated: 0,
        queued: 0,
        ended: 0,
        skipped: 0,
        errors: [],
    };

    for (const rule of dueRules) {
        try {
            const [template] = await client
                .select()
                .from(expenseTemplates)
                .where(and(eq(expenseTemplates.id, rule.templateId), isNull(expenseTemplates.deletedAt)))
                .limit(1);

            if (!template) {
                // Template gone; leave the rule alone — user can delete it manually.
                result.skipped++;
                continue;
            }

            if (!template.defaultCategoryName) {
                result.skipped++;
                continue;
            }

            let currentNextIso = rule.nextOccurrenceAt!;
            let occurrenceCount = rule.occurrenceCount;
            let safety = MAX_CATCHUP_PER_RULE;

            while (safety-- > 0) {
                const currentNextDate = parseISO(currentNextIso);
                if (currentNextDate.getTime() > now.getTime()) break;

                const anchor = parseISO(rule.anchorDate);
                const nextNextDate = computeNextOccurrence(
                    anchor,
                    rule.scheduleUnit as ScheduleUnit,
                    rule.scheduleInterval,
                    currentNextDate,
                );
                const nextNextIso = formatISO(new UTCDate(nextNextDate));

                const willExhaust = isScheduleExhausted({
                    occurrenceCount: occurrenceCount + 1,
                    endAfterCount: rule.endAfterCount,
                    endDate: rule.endDate ? parseISO(rule.endDate) : null,
                    nextOccurrenceAt: nextNextDate,
                });

                // Claim this occurrence: advance the rule atomically.
                // If concurrent callers raced, WHERE nextOccurrenceAt = currentNextIso fails
                // for all but one and we break out.
                const claim = await client
                    .update(recurringExpenses)
                    .set({
                        nextOccurrenceAt: willExhaust ? null : nextNextIso,
                        occurrenceCount: occurrenceCount + 1,
                        lastGeneratedAt: currentNextIso,
                        status: willExhaust ? 'ended' : 'active',
                        ...updateAuditFields({ userId: CRON_SYSTEM_USER_ID }),
                    })
                    .where(
                        and(
                            eq(recurringExpenses.id, rule.id),
                            eq(recurringExpenses.nextOccurrenceAt, currentNextIso),
                        ),
                    )
                    .run();

                const claimed = (claim.meta?.changes ?? 0) > 0;
                if (!claimed) break;

                // Create the artifact for this occurrence.
                const amount = rule.amountOverride ?? template.defaultAmount ?? 0;
                if (amount <= 0) {
                    // Nothing sensible to generate — skip this iteration.
                    occurrenceCount++;
                    if (willExhaust) {
                        result.ended++;
                        break;
                    }
                    currentNextIso = nextNextIso;
                    continue;
                }

                const paidBy =
                    template.defaultPaidBy === '__creator__'
                        ? rule.createdBy
                        : template.defaultPaidBy ?? null;
                const note = rule.name ?? template.defaultNote ?? template.name;

                if (rule.generationMode === 'auto') {
                    const expenseId = createId();
                    let fundTransactionId: string | null = null;
                    let resolvedFundMode: 'paid_by_fund' | 'pending_reimbursement' | null = null;

                    if (template.defaultFundId) {
                        const [fund] = await client
                            .select()
                            .from(funds)
                            .where(eq(funds.id, template.defaultFundId))
                            .limit(1);

                        if (fund && fund.status === 'active' && fund.vaultId === rule.vaultId && isNullSafe(fund.deletedAt)) {
                            const preferredMode =
                                (template.defaultFundPaymentMode as
                                    | 'paid_by_fund'
                                    | 'pending_reimbursement'
                                    | null) ?? 'paid_by_fund';

                            // Fall back to pending_reimbursement when the fund can't cover.
                            resolvedFundMode =
                                preferredMode === 'paid_by_fund' && fund.balance < amount
                                    ? 'pending_reimbursement'
                                    : preferredMode;

                            fundTransactionId = await attachFundToExpense(
                                expenseId,
                                rule.vaultId,
                                fund.id,
                                resolvedFundMode,
                                amount,
                                CRON_SYSTEM_USER_ID,
                                env,
                            );
                        }
                    }

                    await client.insert(expenses).values({
                        id: expenseId,
                        note,
                        amount,
                        categoryName: template.defaultCategoryName,
                        paymentType: template.defaultPaymentType ?? 'cash',
                        date: currentNextIso,
                        paidBy,
                        vaultId: rule.vaultId,
                        expenseTemplateId: rule.templateId,
                        recurringExpenseId: rule.id,
                        fundId: resolvedFundMode ? template.defaultFundId : null,
                        fundPaymentMode: resolvedFundMode,
                        fundTransactionId,
                        ...initialAuditFields({ userId: CRON_SYSTEM_USER_ID }),
                    });

                    result.autoCreated++;
                } else {
                    await client.insert(pendingRecurringOccurrences).values({
                        vaultId: rule.vaultId,
                        recurringExpenseId: rule.id,
                        dueDate: currentNextIso,
                        suggestedAmount: amount,
                        status: 'pending',
                        ...initialAuditFields({ userId: CRON_SYSTEM_USER_ID }),
                    });

                    result.queued++;
                }

                occurrenceCount++;
                if (willExhaust) {
                    result.ended++;
                    break;
                }
                currentNextIso = nextNextIso;
            }

            result.rulesProcessed++;
        } catch (error) {
            result.errors.push({
                ruleId: rule.id,
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return result;
};

function isNullSafe(value: string | null): boolean {
    return value === null || value === undefined;
}
