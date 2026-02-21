import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { topUpFundSchema } from '$lib/schemas/funds';

export const load = async ({ params }) => {
    const { vaultId, fundId } = params;

    const form = await superValidate(
        valibot(topUpFundSchema, {
            defaults: {
                id: fundId,
                vaultId,
                amount: 0,
            },
        })
    );

    return { form, vaultId, fundId };
};
