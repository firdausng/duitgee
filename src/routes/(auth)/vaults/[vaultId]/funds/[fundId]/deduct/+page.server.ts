import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { deductFundSchema } from '$lib/schemas/funds';

export const load = async ({ params }) => {
    const { vaultId, fundId } = params;

    const form = await superValidate(
        valibot(deductFundSchema, {
            defaults: {
                id: fundId,
                vaultId,
                amount: 0,
            },
        })
    );

    return { form, vaultId, fundId };
};
