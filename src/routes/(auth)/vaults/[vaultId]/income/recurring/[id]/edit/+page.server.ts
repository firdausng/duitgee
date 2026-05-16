import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateRecurringIncomeSchema } from '$lib/schemas/recurringIncome';
import { utcToLocalDatetimeString } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRecurringIncome } from '$lib/server/api/recurring-income/getRecurringIncomeHandler';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
    if (platform === undefined) throw new Error('No platform');
    if (!locals.currentUser) throw error(401, 'Unauthorized');

    const { vaultId, id } = params;
    const session = locals.currentSession;
    const env = platform.env;

    const rule = await getRecurringIncome(session, { vaultId, id }, env).catch(() => null);
    if (!rule) throw error(404, 'Recurring income rule not found');

    const form = await superValidate(
        valibot(updateRecurringIncomeSchema, {
            defaults: {
                id,
                vaultId,
                name: rule.name,
                amountOverride: rule.amountOverride,
                scheduleUnit: rule.scheduleUnit as 'day' | 'week' | 'month' | 'year',
                scheduleInterval: rule.scheduleInterval,
                anchorDate: utcToLocalDatetimeString(rule.anchorDate),
                generationMode: rule.generationMode as 'auto' | 'queue',
                endDate: rule.endDate,
            },
        }),
    );

    return { form, vaultId, id, rule };
};
