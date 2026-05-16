import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { createRecurringIncomeSchema } from '$lib/schemas/recurringIncome';
import { formatDatetimeLocal } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getIncomeTemplates } from '$lib/server/api/income/getIncomeTemplatesHandler';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
    if (platform === undefined) throw new Error('No platform');
    if (!locals.currentUser) throw error(401, 'Unauthorized');

    const vaultId = params.vaultId;
    const session = locals.currentSession;
    const env = platform.env;

    const templateRows = await getIncomeTemplates(
        session,
        { vaultId, activeOnly: 'true' },
        env,
    ).catch(() => []);

    const templates = (templateRows ?? []).map((t: any) => ({
        id: t.id,
        sourceId: t.sourceId,
        name: t.name,
        icon: t.icon,
        defaultAmount: t.defaultAmount,
    }));

    const form = await superValidate(
        valibot(createRecurringIncomeSchema, {
            defaults: {
                vaultId,
                templateId: '',
                name: null,
                amountOverride: null,
                scheduleUnit: 'month',
                scheduleInterval: 1,
                anchorDate: formatDatetimeLocal(new Date()),
                generationMode: 'queue',
                endDate: null,
                backfill: false,
            },
        }),
    );

    return { form, vaultId, templates };
};
