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
    let carryOverBalance = false;
    let carryOverFundId = '';
    let replenishmentType = 'manual';

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
                carryOverBalance = result.data.policy?.carryOverBalance === 1;
                carryOverFundId = result.data.policy?.carryOverFundId || '';
                replenishmentType = result.data.policy?.replenishmentType || 'manual';
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
                carryOverBalance,
                carryOverFundId,
            },
        })
    );

    return { form, vaultId, fundId, replenishmentType };
};
