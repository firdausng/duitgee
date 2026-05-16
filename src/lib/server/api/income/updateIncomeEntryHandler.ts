import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses, incomeEntries, incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { deleteAuditFields, initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { attachFundToIncome, detachFundFromIncome } from '$lib/server/api/funds/fundIncomeHelpers';
import { parseBreakdown, resolveBreakdown, serializeBreakdown } from './breakdownHelpers';
import type {
    AllowanceLine,
    DeductionLine,
    EntryBreakdownLine,
    UpdateIncomeEntryRequest,
} from '$lib/schemas/income';

/**
 * Edit a single income entry. Template attribution rules:
 *   - If templateId is set, sourceId is derived from the template.
 *   - If only sourceId is set, template is cleared.
 *   - Both null is allowed (fully ad-hoc).
 *
 * Fund integration rewires the top-up transaction when fundId or amount
 * changes — detach + re-attach (simpler than computing a delta for top-ups).
 *
 * Salary breakdown — the load-bearing cascade:
 *   - Any breakdown-touching change (baseAmount, allowances, deductions in
 *     payload) triggers a re-resolve + snapshot update.
 *   - Linked deduction expenses are wiped and re-inserted from the new
 *     snapshot. Simpler and correct vs label-diff matching; the audit-trail
 *     churn is acceptable since these rows are read-only anyway.
 *   - When no breakdown field is in the payload, the existing snapshot stays
 *     untouched and no expense work happens.
 */
export const updateIncomeEntry = async (
    session: App.AuthSession,
    data: UpdateIncomeEntryRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [existing] = await client
        .select()
        .from(incomeEntries)
        .where(
            and(
                eq(incomeEntries.id, data.id),
                eq(incomeEntries.vaultId, data.vaultId),
                isNull(incomeEntries.deletedAt),
            ),
        )
        .limit(1);
    if (!existing) throw new Error('Income entry not found');

    let nextTemplateId: string | null = existing.templateId;
    let nextSourceId: string | null = existing.sourceId;
    let templateName: string | null = null;

    if (data.templateId !== undefined) {
        nextTemplateId = data.templateId;
        if (data.templateId) {
            const [template] = await client
                .select({ sourceId: incomeTemplates.sourceId, name: incomeTemplates.name })
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
            nextSourceId = template.sourceId;
            templateName = template.name;
        } else {
            nextSourceId = data.sourceId !== undefined ? data.sourceId : existing.sourceId;
        }
    } else if (data.sourceId !== undefined) {
        if (data.sourceId) {
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
        nextSourceId = data.sourceId;
    }

    // If we're keeping the existing template, grab its name for the expense notes.
    if (!templateName && nextTemplateId) {
        const [t] = await client
            .select({ name: incomeTemplates.name })
            .from(incomeTemplates)
            .where(eq(incomeTemplates.id, nextTemplateId))
            .limit(1);
        templateName = t?.name ?? null;
    }

    // ── Breakdown computation ────────────────────────────────────────────
    // Touched when ANY of baseAmount/allowances/deductions is in the payload.
    // Otherwise the snapshot + linked expenses stay untouched.
    const breakdownTouched =
        data.baseAmount !== undefined ||
        data.allowances !== undefined ||
        data.deductions !== undefined;

    let nextBaseAmount: number | null = existing.baseAmount;
    let nextAllowancesJson: string | null = existing.allowances;
    let nextDeductionsJson: string | null = existing.deductions;
    let nextAmount = data.amount ?? existing.amount;
    let resolvedDeductions: EntryBreakdownLine[] = [];

    if (breakdownTouched) {
        const baseAmount =
            data.baseAmount !== undefined ? data.baseAmount : existing.baseAmount;
        const allowances =
            data.allowances !== undefined
                ? (data.allowances ?? [])
                : (parseBreakdown<AllowanceLine>(existing.allowances) ?? []);
        const deductions =
            data.deductions !== undefined
                ? (data.deductions ?? [])
                : (parseBreakdown<DeductionLine>(existing.deductions) ?? []);

        if (baseAmount === null || baseAmount === undefined) {
            // Breakdown cleared — wipe snapshots, fall back to user-supplied amount.
            nextBaseAmount = null;
            nextAllowancesJson = null;
            nextDeductionsJson = null;
            resolvedDeductions = [];
            // Keep nextAmount as data.amount ?? existing.amount.
        } else {
            const resolved = resolveBreakdown(baseAmount, allowances, deductions);
            nextBaseAmount = baseAmount;
            nextAmount = resolved.gross;
            nextAllowancesJson = serializeBreakdown(resolved.resolvedAllowances);
            nextDeductionsJson = serializeBreakdown(resolved.resolvedDeductions);
            resolvedDeductions = resolved.resolvedDeductions;
        }
    }

    const next = {
        templateId: nextTemplateId,
        sourceId: nextSourceId,
        amount: nextAmount,
        baseAmount: nextBaseAmount,
        allowances: nextAllowancesJson,
        deductions: nextDeductionsJson,
        date: data.date ?? existing.date,
        paidTo: data.paidTo !== undefined ? data.paidTo : existing.paidTo,
        note: data.note !== undefined ? data.note : existing.note,
        fundId: data.fundId !== undefined ? data.fundId : existing.fundId,
    };

    // ── Fund rewire (uses the final `next.amount`, including breakdown effects) ──
    const fundChanged = next.fundId !== existing.fundId;
    const amountChanged = next.amount !== existing.amount;

    let newTxnId: string | null = existing.fundTransactionId;

    if (fundChanged || amountChanged) {
        await detachFundFromIncome(existing.fundTransactionId, userId, env);
        newTxnId = null;
    }
    if (next.fundId && (fundChanged || amountChanged)) {
        newTxnId = await attachFundToIncome(
            existing.id,
            existing.vaultId,
            next.fundId,
            next.amount,
            userId,
            env,
        );
    } else if (!next.fundId) {
        newTxnId = null;
    }

    const audit = updateAuditFields({ userId });
    const insertAudit = initialAuditFields({ userId });

    // ── Build the cascade batch ──────────────────────────────────────────
    const ops: unknown[] = [
        client
            .update(incomeEntries)
            .set({ ...next, fundTransactionId: newTxnId, ...audit })
            .where(eq(incomeEntries.id, existing.id)),
    ];

    if (breakdownTouched) {
        // Soft-delete all currently-linked deduction expenses, then re-insert
        // from the new snapshot. Simpler than label-diff matching.
        ops.push(
            client
                .update(expenses)
                .set(deleteAuditFields({ userId }))
                .where(
                    and(
                        eq(expenses.incomeEntryId, existing.id),
                        isNull(expenses.deletedAt),
                    ),
                ),
        );

        const labelPrefix = templateName ?? 'Income';
        for (const line of resolvedDeductions) {
            ops.push(
                client.insert(expenses).values({
                    id: createId(),
                    vaultId: existing.vaultId,
                    amount: line.computedAmount,
                    categoryName: line.categoryName ?? 'Salary deductions',
                    paymentType: 'transfer',
                    date: next.date,
                    paidBy: next.paidTo,
                    note: `${labelPrefix} — ${line.label}`,
                    incomeEntryId: existing.id,
                    status: 'confirmed',
                    ...insertAudit,
                }),
            );
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.batch(ops as any);

    const [updated] = await client
        .select()
        .from(incomeEntries)
        .where(eq(incomeEntries.id, existing.id))
        .limit(1);

    return updated;
};
