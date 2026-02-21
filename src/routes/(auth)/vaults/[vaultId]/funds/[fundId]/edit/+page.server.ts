import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateFundSchema } from '$lib/schemas/funds';

export const load = async ({ params, fetch }) => {
    const { vaultId, fundId } = params;

    let fundName = '';
    let fundDescription = '';
    let fundColor = '';
    let fundIcon = '';
    let fundIconType = '';

    try {
        const response = await fetch(`/api/getFund?vaultId=${vaultId}&id=${fundId}`);
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                fundName = result.data.fund.name || '';
                fundDescription = result.data.fund.description || '';
                fundColor = result.data.fund.color || '';
                fundIcon = result.data.fund.icon || '';
                fundIconType = result.data.fund.iconType || '';
            }
        }
    } catch {
        // will show empty form
    }

    const form = await superValidate(
        valibot(updateFundSchema, {
            defaults: {
                id: fundId,
                vaultId,
                name: fundName,
                description: fundDescription,
                color: fundColor,
                icon: fundIcon,
                iconType: fundIconType,
            },
        })
    );

    return { form, vaultId, fundId };
};
