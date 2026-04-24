import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateRecurringExpenseWithTemplateSchema } from '$lib/schemas/recurringExpenses';
import { utcToLocalDatetimeString } from '$lib/utils';

export const load = async ({ params, fetch }) => {
    const { vaultId, id } = params;

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

    let rule: RuleResponse | null = null;
    try {
        const res = await fetch(`/api/getRecurringExpense?vaultId=${vaultId}&id=${id}`);
        if (res.ok) {
            const json = (await res.json()) as { success: boolean; data: RuleResponse };
            if (json.success) rule = json.data;
        }
    } catch {
        // fall through — empty form
    }

    let members: Array<{ userId: string; displayName: string }> = [];
    try {
        const res = await fetch(`/api/getVault?vaultId=${vaultId}`);
        if (res.ok) {
            const json = (await res.json()) as { success: boolean; data: { members: typeof members } };
            if (json.success && json.data) members = json.data.members ?? [];
        }
    } catch {
        // non-critical
    }

    let funds: Array<{ id: string; name: string; icon: string | null; balance: number }> = [];
    try {
        const res = await fetch(`/api/getFunds?vaultId=${vaultId}`);
        if (res.ok) {
            const json = (await res.json()) as {
                success: boolean;
                data: Array<{ fund: { id: string; name: string; icon: string | null; balance: number; status: string } }>;
            };
            if (json.success) {
                funds = (json.data ?? []).map((row) => row.fund).filter((f) => f.status === 'active');
            }
        }
    } catch {
        // non-critical
    }

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
