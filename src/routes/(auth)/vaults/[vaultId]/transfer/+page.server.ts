import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { transferFundsSchema } from '$lib/schemas/funds';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getFunds } from '$lib/server/api/funds/getFundsHandler';

export const load: PageServerLoad = async ({ params, url, locals, platform }) => {
    if (platform === undefined) throw new Error('No platform');
    if (!locals.currentUser) throw error(401, 'Unauthorized');

    const vaultId = params.vaultId;
    const fromFundId = url.searchParams.get('fromFundId') ?? '';

    const form = await superValidate(
        valibot(transferFundsSchema, {
            defaults: {
                vaultId,
                fromFundId,
                toFundId: '',
                amount: 0,
            },
        })
    );

    const fundRows = await getFunds(vaultId, locals.currentSession, platform.env).catch((err) => {
        console.error('Failed to load funds:', err);
        return [];
    });

    const funds: Array<{ id: string; name: string; balance: number; status: string }> = (fundRows ?? [])
        .map((row: any) => row.fund)
        .filter((f: any) => f.status === 'active');

    return { form, vaultId, funds };
};
