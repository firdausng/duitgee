import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    pendingRecurringIncomeOccurrences,
    recurringIncome,
    incomeTemplates,
    incomeEntries,
    expenses,
} from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { attachFundToIncome } from '$lib/server/api/funds/fundIncomeHelpers';
import {
    parseBreakdown,
    resolveBreakdown,
    serializeBreakdown,
} from '$lib/server/api/income/breakdownHelpers';
import type { AllowanceLine, DeductionLine } from '$lib/schemas/income';
import type { ApprovePendingIncomeOccurrenceRequest } from '$lib/schemas/recurringIncome';

/**
 * Convert a pending occurrence into a real income entry. Mirrors the entry-
 * create logic from the engine: resolves the template's breakdown against the
 * (optionally overridden) amount, materializes deduction expenses, and links
 * back via approvedEntryId for traceability.
 */
export const approvePendingIncomeOccurrence = async (
    session: App.AuthSession,
    data: ApprovePendingIncomeOccurrenceRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [pending] = await client
        .select()
        .from(pendingRecurringIncomeOccurrences)
        .where(
            and(
                eq(pendingRecurringIncomeOccurrences.id, data.occurrenceId),
                eq(pendingRecurringIncomeOccurrences.vaultId, data.vaultId),
                eq(pendingRecurringIncomeOccurrences.status, 'pending'),
            ),
        )
        .limit(1);
    if (!pending) throw new Error('Pending occurrence not found or already resolved');

    const [rule] = await client
        .select()
        .from(recurringIncome)
        .where(eq(recurringIncome.id, pending.recurringIncomeId))
        .limit(1);
    if (!rule) throw new Error('Recurring income rule not found');

    const [template] = await client
        .select()
        .from(incomeTemplates)
        .where(and(eq(incomeTemplates.id, rule.templateId), isNull(incomeTemplates.deletedAt)))
        .limit(1);
    if (!template) throw new Error('Income template not found');

    // Approval amount comes from the override → suggestedAmount → rule/template base.
    const baseAmount =
        data.amountOverride ?? rule.amountOverride ?? template.defaultAmount ?? pending.suggestedAmount;

    const templateAllowances =
        parseBreakdown<AllowanceLine>(template.defaultAllowances) ?? [];
    const templateDeductions =
        parseBreakdown<DeductionLine>(template.defaultDeductions) ?? [];

    const { gross, resolvedAllowances, resolvedDeductions } = resolveBreakdown(
        baseAmount,
        templateAllowances,
        templateDeductions,
    );

    const entryId = createId();
    let fundTransactionId: string | null = null;

    if (template.defaultFundId) {
        fundTransactionId = await attachFundToIncome(
            entryId,
            rule.vaultId,
            template.defaultFundId,
            gross,
            userId,
            env,
        );
    }

    const audit = initialAuditFields({ userId });
    const labelPrefix = rule.name ?? template.name;
    const note = data.noteOverride ?? rule.name ?? template.defaultNote ?? null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inserts: any[] = [
        client.insert(incomeEntries).values({
            id: entryId,
            vaultId: rule.vaultId,
            templateId: rule.templateId,
            sourceId: template.sourceId,
            amount: gross,
            baseAmount,
            allowances: serializeBreakdown(resolvedAllowances),
            deductions: serializeBreakdown(resolvedDeductions),
            date: pending.dueDate,
            paidTo: template.defaultPaidTo ?? null,
            note,
            fundId: template.defaultFundId ?? null,
            fundTransactionId,
            recurringIncomeId: rule.id,
            ...audit,
        }),
    ];

    for (const line of resolvedDeductions) {
        inserts.push(
            client.insert(expenses).values({
                id: createId(),
                vaultId: rule.vaultId,
                amount: line.computedAmount,
                categoryName: line.categoryName ?? 'Salary deductions',
                paymentType: 'transfer',
                date: pending.dueDate,
                paidBy: template.defaultPaidTo ?? null,
                note: `${labelPrefix} — ${line.label}`,
                incomeEntryId: entryId,
                status: 'confirmed',
                ...audit,
            }),
        );
    }

    inserts.push(
        client
            .update(pendingRecurringIncomeOccurrences)
            .set({
                status: 'approved',
                approvedEntryId: entryId,
                ...updateAuditFields({ userId }),
            })
            .where(eq(pendingRecurringIncomeOccurrences.id, pending.id)),
    );

    await client.batch(inserts as any);

    const [entry] = await client
        .select()
        .from(incomeEntries)
        .where(eq(incomeEntries.id, entryId))
        .limit(1);
    return { entry, pending: { ...pending, status: 'approved' as const } };
};
