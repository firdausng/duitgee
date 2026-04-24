import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateRecurringExpenseSchema } from '$lib/schemas/recurringExpenses';
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

    const form = await superValidate(
        valibot(updateRecurringExpenseSchema, {
            defaults: {
                id,
                vaultId,
                name: rule?.name ?? null,
                amountOverride: rule?.amountOverride ?? null,
                scheduleUnit: rule?.scheduleUnit ?? 'month',
                scheduleInterval: rule?.scheduleInterval ?? 1,
                anchorDate: rule?.anchorDate ? utcToLocalDatetimeString(rule.anchorDate) : '',
                generationMode: rule?.generationMode ?? 'queue',
                endDate: rule?.endDate ? utcToLocalDatetimeString(rule.endDate) : null,
                endAfterCount: rule?.endAfterCount ?? null,
            },
        }),
    );

    return { form, vaultId, id, rule };
};
