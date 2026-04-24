import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { createRecurringExpenseWithTemplateSchema } from '$lib/schemas/recurringExpenses';
import { formatDatetimeLocal } from '$lib/utils';

export const load = async ({ params, fetch }) => {
    const vaultId = params.vaultId;

    const form = await superValidate(
        valibot(createRecurringExpenseWithTemplateSchema, {
            defaults: {
                vaultId,
                name: '',
                icon: '🔁',
                defaultAmount: 0,
                defaultCategoryName: '',
                defaultPaymentType: 'cash',
                defaultPaidBy: '__creator__',
                scheduleUnit: 'month',
                scheduleInterval: 1,
                anchorDate: formatDatetimeLocal(new Date()),
                generationMode: 'queue',
                backfill: false,
            },
        }),
    );

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
            const json = (await res.json()) as { success: boolean; data: Array<{ fund: { id: string; name: string; icon: string | null; balance: number; status: string } }> };
            if (json.success) {
                funds = (json.data ?? [])
                    .map((row) => row.fund)
                    .filter((f) => f.status === 'active');
            }
        }
    } catch {
        // non-critical
    }

    return { form, vaultId, members, funds };
};
