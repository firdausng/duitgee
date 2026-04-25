import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateFundSchema } from '$lib/schemas/funds';
import type { PolicyLike } from '$lib/utils/fund-summary';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getFund } from '$lib/server/api/funds/getFundHandler';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
    if (platform === undefined) throw new Error('No platform');
    if (!locals.currentUser) throw error(401, 'Unauthorized');

    const { vaultId, fundId } = params;
    const session = locals.currentSession;
    const env = platform.env;

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

    const [fundData, vaultResult] = await Promise.all([
        getFund(vaultId, fundId, session, env).catch((err) => {
            console.error('Failed to load fund:', err);
            return null;
        }),
        getVault(session, vaultId, env).catch((err) => {
            console.error('Failed to load vault:', err);
            return null;
        }),
    ]);

    if (fundData) {
        fundName = fundData.fund.name || '';
        fundDescription = fundData.fund.description || '';
        fundColor = fundData.fund.color || '';
        fundIcon = fundData.fund.icon || '';
        fundIconType = fundData.fund.iconType || '';
        carryOverBalance = (fundData as any).policy?.carryOverBalance === 1;
        carryOverFundId = (fundData as any).policy?.carryOverFundId || '';
        replenishmentType = (fundData as any).policy?.replenishmentType || 'manual';

        fundContext = {
            balance: fundData.fund.balance ?? 0,
            status: fundData.fund.status ?? 'active',
            color: fundData.fund.color ?? null,
            icon: fundData.fund.icon ?? null,
        };
        activeCycle = (fundData as any).activeCycle
            ? {
                periodStart: (fundData as any).activeCycle.periodStart,
                periodEnd: (fundData as any).activeCycle.periodEnd,
            }
            : null;
        policy = (fundData as any).policy ?? null;
        carryOverFundName = (fundData as any).carryOverFundName ?? null;
    }

    if (vaultResult?.vaults) {
        locale = vaultResult.vaults.locale || 'en-US';
        currency = vaultResult.vaults.currency || 'USD';
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
