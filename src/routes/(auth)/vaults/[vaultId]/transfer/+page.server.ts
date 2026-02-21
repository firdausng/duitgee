import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { transferFundsSchema } from '$lib/schemas/funds';

export const load = async ({ params, url, fetch }) => {
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

    let funds: Array<{ id: string; name: string; balance: number; status: string }> = [];
    try {
        const response = await fetch(`/api/getFunds?vaultId=${vaultId}`);
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                funds = (result.data ?? [])
                    .map((row: any) => row.fund)
                    .filter((f: any) => f.status === 'active');
            }
        }
    } catch {
        // will show empty list
    }

    return { form, vaultId, funds };
};
