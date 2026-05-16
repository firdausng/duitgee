import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    recurringIncome,
    pendingRecurringIncomeOccurrences,
    incomeTemplates,
    incomeEntries,
    expenses,
    funds,
} from '$lib/server/db/schema';
import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm';
import { UTCDate } from '@date-fns/utc';
import { formatISO, parseISO } from 'date-fns';
import { createId } from '@paralleldrive/cuid2';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { attachFundToIncome } from '$lib/server/api/funds/fundIncomeHelpers';
import {
    parseBreakdown,
    resolveBreakdown,
    serializeBreakdown,
} from '$lib/server/api/income/breakdownHelpers';
import {
    computeNextOccurrence,
    isScheduleExhausted,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import type { AllowanceLine, DeductionLine } from '$lib/schemas/income';

export const CRON_SYSTEM_USER_ID = 'system:cron';

const MAX_CATCHUP_PER_RULE = 50;

export interface ProcessDueRecurringIncomeOptions {
    now?: Date;
    vaultId?: string;
    ruleId?: string;
}

export interface ProcessDueRecurringIncomeResult {
    rulesProcessed: number;
    autoCreated: number;
    queued: number;
    ended: number;
    skipped: number;
    errors: Array<{ ruleId: string; message: string }>;
}

/**
 * Advance every due recurring income rule. Symmetric to the recurring-expenses
 * engine: for each due occurrence either generate an income entry (auto mode,
 * with the full salary breakdown materialized + linked deduction expenses) or
 * stash a pending occurrence for user approval (queue mode).
 *
 * Idempotent: atomic UPDATE-with-WHERE claim guards against double generation
 * when the cron runs concurrently with a lazy catch-up.
 */
export const processDueRecurringIncome = async (
    env: Cloudflare.Env,
    options: ProcessDueRecurringIncomeOptions = {},
): Promise<ProcessDueRecurringIncomeResult> => {
    const client = drizzle(env.DB, { schema });
    const now = options.now ?? new UTCDate();
    const nowIso = formatISO(new UTCDate(now));

    const conditions = [
        eq(recurringIncome.status, 'active'),
        isNotNull(recurringIncome.nextOccurrenceAt),
        lte(recurringIncome.nextOccurrenceAt, nowIso),
        isNull(recurringIncome.deletedAt),
    ];
    if (options.vaultId) conditions.push(eq(recurringIncome.vaultId, options.vaultId));
    if (options.ruleId) conditions.push(eq(recurringIncome.id, options.ruleId));

    const dueRules = await client.select().from(recurringIncome).where(and(...conditions));

    const result: ProcessDueRecurringIncomeResult = {
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
                .from(incomeTemplates)
                .where(and(eq(incomeTemplates.id, rule.templateId), isNull(incomeTemplates.deletedAt)))
                .limit(1);

            if (!template) {
                result.skipped++;
                continue;
            }

            const baseAmount = rule.amountOverride ?? template.defaultAmount ?? 0;
            if (baseAmount <= 0) {
                result.skipped++;
                continue;
            }

            // Pre-parse the breakdown defaults once per rule.
            const templateAllowances =
                parseBreakdown<AllowanceLine>(template.defaultAllowances) ?? [];
            const templateDeductions =
                parseBreakdown<DeductionLine>(template.defaultDeductions) ?? [];

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

                // Income has no endAfterCount — only endDate.
                const willExhaust = isScheduleExhausted({
                    occurrenceCount: occurrenceCount + 1,
                    endAfterCount: null,
                    endDate: rule.endDate ? parseISO(rule.endDate) : null,
                    nextOccurrenceAt: nextNextDate,
                });

                // Atomic claim — concurrent runners lose the WHERE match and break.
                const claim = await client
                    .update(recurringIncome)
                    .set({
                        nextOccurrenceAt: willExhaust ? null : nextNextIso,
                        occurrenceCount: occurrenceCount + 1,
                        lastGeneratedAt: currentNextIso,
                        status: willExhaust ? 'ended' : 'active',
                        ...updateAuditFields({ userId: CRON_SYSTEM_USER_ID }),
                    })
                    .where(
                        and(
                            eq(recurringIncome.id, rule.id),
                            eq(recurringIncome.nextOccurrenceAt, currentNextIso),
                        ),
                    )
                    .run();

                const claimed = (claim.meta?.changes ?? 0) > 0;
                if (!claimed) break;

                const occurrenceDate = currentNextIso;
                const paidTo = template.defaultPaidTo ?? null;

                if (rule.generationMode === 'auto') {
                    // Resolve breakdown against base → gross + snapshots + deductions.
                    const { gross, resolvedAllowances, resolvedDeductions } = resolveBreakdown(
                        baseAmount,
                        templateAllowances,
                        templateDeductions,
                    );

                    const entryId = createId();
                    let fundTransactionId: string | null = null;

                    if (template.defaultFundId) {
                        const [fund] = await client
                            .select()
                            .from(funds)
                            .where(eq(funds.id, template.defaultFundId))
                            .limit(1);

                        if (
                            fund &&
                            fund.status === 'active' &&
                            fund.vaultId === rule.vaultId &&
                            !fund.deletedAt
                        ) {
                            fundTransactionId = await attachFundToIncome(
                                entryId,
                                rule.vaultId,
                                fund.id,
                                gross,
                                CRON_SYSTEM_USER_ID,
                                env,
                            );
                        }
                    }

                    const audit = initialAuditFields({ userId: CRON_SYSTEM_USER_ID });

                    // Build batch: entry + N linked deduction expenses.
                    const inserts: unknown[] = [
                        client.insert(incomeEntries).values({
                            id: entryId,
                            vaultId: rule.vaultId,
                            templateId: rule.templateId,
                            sourceId: template.sourceId,
                            amount: gross,
                            baseAmount,
                            allowances: serializeBreakdown(resolvedAllowances),
                            deductions: serializeBreakdown(resolvedDeductions),
                            date: occurrenceDate,
                            paidTo,
                            note: rule.name ?? template.defaultNote ?? null,
                            fundId: template.defaultFundId ?? null,
                            fundTransactionId,
                            recurringIncomeId: rule.id,
                            ...audit,
                        }),
                    ];

                    const labelPrefix = rule.name ?? template.name;
                    for (const line of resolvedDeductions) {
                        inserts.push(
                            client.insert(expenses).values({
                                id: createId(),
                                vaultId: rule.vaultId,
                                amount: line.computedAmount,
                                categoryName: line.categoryName ?? 'Salary deductions',
                                paymentType: 'transfer',
                                date: occurrenceDate,
                                paidBy: paidTo,
                                note: `${labelPrefix} — ${line.label}`,
                                incomeEntryId: entryId,
                                status: 'confirmed',
                                ...audit,
                            }),
                        );
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await client.batch(inserts as any);

                    result.autoCreated++;
                } else {
                    await client.insert(pendingRecurringIncomeOccurrences).values({
                        vaultId: rule.vaultId,
                        recurringIncomeId: rule.id,
                        dueDate: occurrenceDate,
                        // Suggested amount uses the resolved gross so the user
                        // sees the net-of-allowances total they should expect.
                        suggestedAmount: resolveBreakdown(
                            baseAmount,
                            templateAllowances,
                            templateDeductions,
                        ).gross,
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
        } catch (err) {
            console.error({
                message: '[processDueRecurringIncome] rule failed',
                ruleId: rule.id,
                err,
            });
            result.errors.push({
                ruleId: rule.id,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }

    return result;
};
