import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { createIncomeEntrySchema } from '$lib/schemas/income';
import { formatDatetimeLocal } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { getFunds } from '$lib/server/api/funds/getFundsHandler';
import { getIncomeSources } from '$lib/server/api/income/getIncomeSourcesHandler';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
    if (platform === undefined) throw new Error('No platform');
    if (!locals.currentUser) throw error(401, 'Unauthorized');

    const vaultId = params.vaultId;
    const session = locals.currentSession;
    const env = platform.env;

    const [vaultResult, fundRows, sourceRows] = await Promise.all([
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
    ]);

    const form = await superValidate(
        valibot(createIncomeEntrySchema, {
            defaults: {
                vaultId,
                sourceId: null,
                amount: 0,
                date: formatDatetimeLocal(new Date()),
                paidTo: null,
                note: null,
                fundId: null,
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
        defaultAmount: s.defaultAmount,
        defaultPaidTo: s.defaultPaidTo,
        defaultFundId: s.defaultFundId,
        defaultNote: s.defaultNote,
    }));

    return { form, vaultId, members, funds, sources };
};
