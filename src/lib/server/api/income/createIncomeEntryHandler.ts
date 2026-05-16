import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses, incomeEntries, incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { attachFundToIncome } from '$lib/server/api/funds/fundIncomeHelpers';
import {
    parseBreakdown,
    resolveBreakdown,
    serializeBreakdown,
} from './breakdownHelpers';
import type {
    AllowanceLine,
    CreateIncomeEntryRequest,
    DeductionLine,
} from '$lib/schemas/income';

/**
 * Record a single income entry, optionally with a salary breakdown.
 *
 * Attribution rules unchanged from the original:
 *   - templateId provided → sourceId derived from template.sourceId
 *   - templateId null, sourceId provided → ad-hoc-with-source
 *   - both null → fully ad-hoc
 *
 * Breakdown rules (Slice A of the salary-deductions plan):
 *   - If caller supplies allowances/deductions, those win.
 *   - Otherwise, if a templateId is provided, seed from template defaults.
 *   - resolveBreakdown computes gross = baseAmount + sum(allowances).
 *   - amount column is set to gross when a breakdown is in play; falls back
 *     to the user-entered amount when no breakdown is captured.
 *   - Each deduction line becomes one expense row with incomeEntryId back-ref.
 */
export const createIncomeEntry = async (
    session: App.AuthSession,
    data: CreateIncomeEntryRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    let resolvedSourceId: string | null = data.sourceId ?? null;
    let templateName: string | null = null;
    let templateAllowances: AllowanceLine[] | null = null;
    let templateDeductions: DeductionLine[] | null = null;

    if (data.templateId) {
        const [template] = await client
            .select()
            .from(incomeTemplates)
            .where(
                and(
                    eq(incomeTemplates.id, data.templateId),
                    eq(incomeTemplates.vaultId, data.vaultId),
                    isNull(incomeTemplates.deletedAt),
                ),
            )
            .limit(1);
        if (!template) throw new Error('Income template not found in this vault');
        resolvedSourceId = template.sourceId;
        templateName = template.name;
        templateAllowances = parseBreakdown<AllowanceLine>(template.defaultAllowances);
        templateDeductions = parseBreakdown<DeductionLine>(template.defaultDeductions);
    } else if (data.sourceId) {
        const [source] = await client
            .select({ id: incomeSources.id })
            .from(incomeSources)
            .where(
                and(
                    eq(incomeSources.id, data.sourceId),
                    eq(incomeSources.vaultId, data.vaultId),
                    isNull(incomeSources.deletedAt),
                ),
            )
            .limit(1);
        if (!source) throw new Error('Income source not found in this vault');
    }

    // Effective breakdown lists — caller's payload wins; otherwise seed from template.
    const allowances = data.allowances ?? templateAllowances ?? [];
    const deductions = data.deductions ?? templateDeductions ?? [];

    // When a baseAmount is provided, resolve against it; otherwise the
    // user-entered `data.amount` is the canonical figure and no breakdown
    // gets snapshotted.
    let amount = data.amount;
    let baseAmount: number | null = null;
    let allowancesJson: string | null = null;
    let deductionsJson: string | null = null;
    let resolvedDeductionsForExpenses: ReturnType<typeof resolveBreakdown>['resolvedDeductions'] = [];

    if (data.baseAmount !== undefined && data.baseAmount !== null) {
        const { gross, resolvedAllowances, resolvedDeductions } = resolveBreakdown(
            data.baseAmount,
            allowances,
            deductions,
        );
        baseAmount = data.baseAmount;
        amount = gross;
        allowancesJson = serializeBreakdown(resolvedAllowances);
        deductionsJson = serializeBreakdown(resolvedDeductions);
        resolvedDeductionsForExpenses = resolvedDeductions;
    }

    const entryId = createId();
    let fundTransactionId: string | null = null;

    if (data.fundId) {
        fundTransactionId = await attachFundToIncome(
            entryId,
            data.vaultId,
            data.fundId,
            amount,
            userId,
            env,
        );
    }

    const audit = initialAuditFields({ userId });

    const insertEntry = client.insert(incomeEntries).values({
        id: entryId,
        vaultId: data.vaultId,
        templateId: data.templateId ?? null,
        sourceId: resolvedSourceId,
        amount,
        baseAmount,
        allowances: allowancesJson,
        deductions: deductionsJson,
        date: data.date,
        paidTo: data.paidTo ?? null,
        note: data.note ?? null,
        fundId: data.fundId ?? null,
        fundTransactionId,
        ...audit,
    });

    // Build the linked deduction expense rows.
    const labelPrefix = templateName ?? 'Income';
    const expenseInserts = resolvedDeductionsForExpenses.map((line) =>
        client.insert(expenses).values({
            id: createId(),
            vaultId: data.vaultId,
            amount: line.computedAmount,
            categoryName: line.categoryName ?? 'Salary deductions',
            paymentType: 'transfer',
            date: data.date,
            paidBy: data.paidTo ?? null,
            note: `${labelPrefix} — ${line.label}`,
            incomeEntryId: entryId,
            status: 'confirmed',
            ...audit,
        }),
    );

    // Atomic batch: entry + N deduction expense rows.
    if (expenseInserts.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.batch([insertEntry, ...expenseInserts] as any);
    } else {
        await insertEntry;
    }

    // Bump template usage outside the batch (non-critical).
    if (data.templateId) {
        await client
            .update(incomeTemplates)
            .set({
                usageCount: sql`${incomeTemplates.usageCount} + 1`,
                lastUsedAt: formatISO(new UTCDate()),
                ...updateAuditFields({ userId }),
            })
            .where(eq(incomeTemplates.id, data.templateId));
    }

    // Re-read so the returned shape matches what's persisted.
    const [entry] = await client
        .select()
        .from(incomeEntries)
        .where(eq(incomeEntries.id, entryId))
        .limit(1);

    return entry;
};
