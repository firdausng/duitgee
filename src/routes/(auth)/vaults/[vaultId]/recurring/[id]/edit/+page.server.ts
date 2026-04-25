import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateRecurringExpenseWithTemplateSchema } from '$lib/schemas/recurringExpenses';
import { utcToLocalDatetimeString } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRecurringExpense } from '$lib/server/api/recurring-expenses/getRecurringExpenseHandler';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { getFunds } from '$lib/server/api/funds/getFundsHandler';

type RuleResponse = {
    id: string;
    vaultId: string;
    templateId: string;
    name: string | null;
    amountOverride: number | null;
    scheduleUnit: 'day' | 'week' | 'month' | 'year';
    scheduleInterval: number;
    anchorDate: string;
    generationMode: 'auto' | 'queue';
    status: 'active' | 'paused' | 'ended';
    endDate: string | null;
    endAfterCount: number | null;
    template: {
        name: string | null;
        icon: string | null;
        defaultAmount: number | null;
        defaultCategoryName: string | null;
        defaultNote: string | null;
        defaultPaymentType: string | null;
        defaultPaidBy: string | null;
        defaultFundId: string | null;
        defaultFundPaymentMode: string | null;
    };
    progress: {
        paidCount: number;
        paidAmount: number;
        pendingCount: number;
        totalAmount: number | null;
        finalOccurrenceAt: string | null;
    };
};

export const load: PageServerLoad = async ({ params, locals, platform }) => {
    if (platform === undefined) throw new Error('No platform');
    if (!locals.currentUser) throw error(401, 'Unauthorized');

    const { vaultId, id } = params;
    const session = locals.currentSession;
    const env = platform.env;

    const [ruleResult, vaultResult, fundRows] = await Promise.all([
        getRecurringExpense(session, { vaultId, id }, env).catch(() => null),
        getVault(session, vaultId, env).catch((err) => {
            console.error('Failed to load vault:', err);
            return null;
        }),
        getFunds(vaultId, session, env).catch((err) => {
            console.error('Failed to load funds:', err);
            return [];
        }),
    ]);

    const rule = ruleResult as RuleResponse | null;

    const members: Array<{ userId: string; displayName: string }> = (vaultResult?.members ?? []).map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
    }));

    const funds: Array<{ id: string; name: string; icon: string | null; balance: number }> = (fundRows ?? [])
        .map((row: any) => ({
            id: row.fund.id,
            name: row.fund.name,
            icon: row.fund.icon ?? null,
            balance: row.fund.balance,
            status: row.fund.status,
        }))
        .filter((f) => f.status === 'active')
        .map(({ status, ...rest }) => rest);

    const effectiveAmount = rule?.amountOverride ?? rule?.template.defaultAmount ?? 0;

    const form = await superValidate(
        valibot(updateRecurringExpenseWithTemplateSchema, {
            defaults: {
                id,
                vaultId,
                name: rule?.name ?? rule?.template.name ?? '',
                icon: rule?.template.icon ?? '🔁',
                defaultAmount: effectiveAmount,
                defaultCategoryName: rule?.template.defaultCategoryName ?? '',
                defaultNote: rule?.template.defaultNote ?? null,
                defaultPaymentType: rule?.template.defaultPaymentType ?? 'cash',
                defaultPaidBy: rule?.template.defaultPaidBy ?? null,
                defaultFundId: rule?.template.defaultFundId ?? null,
                defaultFundPaymentMode: rule?.template.defaultFundPaymentMode as
                    | 'paid_by_fund'
                    | 'pending_reimbursement'
                    | null
                    | undefined,
                scheduleUnit: rule?.scheduleUnit ?? 'month',
                scheduleInterval: rule?.scheduleInterval ?? 1,
                anchorDate: rule?.anchorDate ? utcToLocalDatetimeString(rule.anchorDate) : '',
                generationMode: rule?.generationMode ?? 'queue',
                endDate: null,
                endAfterCount: rule?.endAfterCount ?? null,
                applyToPast: false,
            },
        }),
    );

    return { form, vaultId, id, rule, members, funds };
};
