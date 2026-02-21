import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { createFundSchema } from '$lib/schemas/funds';

export const load = async ({ params }) => {
    const vaultId = params.vaultId;

    const form = await superValidate(
        valibot(createFundSchema, {
            defaults: {
                vaultId,
                replenishmentType: 'manual',
            },
        })
    );

    return { form, vaultId };
};
