import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateIncomeEntrySchema } from '$lib/schemas/income';
import { utcToLocalDatetimeString } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { getFunds } from '$lib/server/api/funds/getFundsHandler';
import { getIncomeSources } from '$lib/server/api/income/getIncomeSourcesHandler';
import { getIncomeTemplates } from '$lib/server/api/income/getIncomeTemplatesHandler';
import { getIncomeEntry } from '$lib/server/api/income/getIncomeEntryHandler';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
    if (platform === undefined) throw new Error('No platform');
    if (!locals.currentUser) throw error(401, 'Unauthorized');

    const { vaultId, id } = params;
    const session = locals.currentSession;
    const env = platform.env;

    const [entryResult, vaultResult, fundRows, sourceRows, templateRows] = await Promise.all([
        getIncomeEntry(session, { vaultId, id }, env).catch(() => null),
        getVault(session, vaultId, env).catch((err) => {
            console.error('Failed to load vault:', err);
            return null;
        }),
        getFunds(vaultId, session, env).catch((err) => {
            console.error('Failed to load funds:', err);
            return [];
        }),
        getIncomeSources(session, { vaultId }, env).catch((err) => {
            console.error('Failed to load income sources:', err);
            return [];
        }),
        getIncomeTemplates(session, { vaultId, activeOnly: 'true' }, env).catch((err) => {
            console.error('Failed to load income templates:', err);
            return [];
        }),
    ]);

    if (!entryResult) throw error(404, 'Income entry not found');

    const form = await superValidate(
        valibot(updateIncomeEntrySchema, {
            defaults: {
                id,
                vaultId,
                templateId: entryResult.templateId,
                sourceId: entryResult.sourceId,
                amount: entryResult.amount,
                date: utcToLocalDatetimeString(entryResult.date),
                paidTo: entryResult.paidTo,
                note: entryResult.note,
                fundId: entryResult.fundId,
            },
        }),
    );

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

    const sources = (sourceRows ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
    }));

    const templates = (templateRows ?? []).map((t: any) => ({
        id: t.id,
        sourceId: t.sourceId,
        name: t.name,
        icon: t.icon,
    }));

    return { form, vaultId, id, entry: entryResult, members, funds, sources, templates };
};
