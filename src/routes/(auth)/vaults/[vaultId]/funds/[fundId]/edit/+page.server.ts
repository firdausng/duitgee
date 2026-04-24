import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateFundSchema } from '$lib/schemas/funds';
import type { PolicyLike } from '$lib/utils/fund-summary';

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

    // Context needed to render the read-only policy summary above the form.
    let fundContext: {
        balance: number;
        status: string;
        color: string | null;
        icon: string | null;
    } | null = null;
    let activeCycle: {
        periodStart: string;
        periodEnd: string;
    } | null = null;
    let policy: PolicyLike | null = null;
    let carryOverFundName: string | null = null;
    let locale = 'en-US';
    let currency = 'USD';

    try {
        const response = await fetch(`/api/getFund?vaultId=${vaultId}&id=${fundId}`);
        if (response.ok) {
            const result = (await response.json()) as { success: boolean; data: any };
            if (result.success && result.data) {
                fundName = result.data.fund.name || '';
                fundDescription = result.data.fund.description || '';
                fundColor = result.data.fund.color || '';
                fundIcon = result.data.fund.icon || '';
                fundIconType = result.data.fund.iconType || '';
                carryOverBalance = result.data.policy?.carryOverBalance === 1;
                carryOverFundId = result.data.policy?.carryOverFundId || '';
                replenishmentType = result.data.policy?.replenishmentType || 'manual';

                fundContext = {
                    balance: result.data.fund.balance ?? 0,
                    status: result.data.fund.status ?? 'active',
                    color: result.data.fund.color ?? null,
                    icon: result.data.fund.icon ?? null,
                };
                activeCycle = result.data.activeCycle
                    ? {
                        periodStart: result.data.activeCycle.periodStart,
                        periodEnd: result.data.activeCycle.periodEnd,
                    }
                    : null;
                policy = result.data.policy ?? null;
                carryOverFundName = result.data.carryOverFundName ?? null;
            }
        }
    } catch {
        // will show empty form
    }

    try {
        const vr = await fetch(`/api/getVault?vaultId=${vaultId}`);
        if (vr.ok) {
            const vjson = (await vr.json()) as { success: boolean; data: any };
            if (vjson.success && vjson.data?.vaults) {
                locale = vjson.data.vaults.locale || 'en-US';
                currency = vjson.data.vaults.currency || 'USD';
            }
        }
    } catch {
        // fall back to defaults
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

    return {
        form,
        vaultId,
        fundId,
        replenishmentType,
        fundContext,
        activeCycle,
        policy,
        carryOverFundName,
        locale,
        currency,
    };
};
