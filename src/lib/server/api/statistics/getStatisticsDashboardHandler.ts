import { getSpendTrend } from './getSpendTrendHandler';
import { getCategoryTrend } from './getCategoryTrendHandler';
import { getCategoryBreakdown } from './getCategoryBreakdownHandler';
import { getMemberBreakdown } from './getMemberBreakdownHandler';
import { getPaymentTypeBreakdown } from './getPaymentTypeBreakdownHandler';
import { getFundSpendTrend } from './getFundSpendTrendHandler';
import { getTemplateBreakdown } from './getTemplateBreakdownHandler';
import type {
    SpendTrendResponse,
    CategoryTrendResponse,
    CategoryBreakdownItem,
    MemberBreakdownItem,
    PaymentTypeBreakdownItem,
    FundSpendTrendResponse,
    TemplateBreakdownItem,
    SpendTrendQuery,
} from '$lib/schemas/statistics';

export interface DashboardQuery extends SpendTrendQuery {
    /** Pro: include member net-position math. */
    includeNetPosition?: boolean;
    /** Top-N for category trend; default 5. */
    topN?: number;
}

export interface StatisticsDashboardResponse {
    spendTrend: SpendTrendResponse;
    categoryTrend: CategoryTrendResponse;
    categoryBreakdown: CategoryBreakdownItem[];
    memberBreakdown: MemberBreakdownItem[];
    paymentTypeBreakdown: PaymentTypeBreakdownItem[];
    fundSpendTrend: FundSpendTrendResponse;
    templateBreakdown: TemplateBreakdownItem[];
}

/**
 * Single round-trip dashboard fetch. Fires all section handlers in parallel.
 *
 * Each handler still runs its own permission + entitlement checks — that's
 * intentional. Refactoring the handlers to skip checks when called via the
 * composite would couple them; the duplicate checks all hit the same indexed
 * row and resolve in ~ms in parallel.
 */
export const getStatisticsDashboard = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: DashboardQuery,
): Promise<StatisticsDashboardResponse> => {
    const baseRange = { vaultId, start: query.start, end: query.end };

    const [
        spendTrend,
        categoryTrend,
        categoryBreakdown,
        memberBreakdown,
        paymentTypeBreakdown,
        fundSpendTrend,
        templateBreakdown,
    ] = await Promise.all([
        getSpendTrend(vaultId, session, env, {
            ...baseRange,
            compare: query.compare ?? 'none',
            granularity: query.granularity,
        }),
        getCategoryTrend(vaultId, session, env, {
            ...baseRange,
            topN: query.topN ?? 5,
            granularity: query.granularity,
        }),
        getCategoryBreakdown(vaultId, session, env, baseRange),
        getMemberBreakdown(vaultId, session, env, {
            ...baseRange,
            includeNetPosition: query.includeNetPosition ?? false,
        }),
        getPaymentTypeBreakdown(vaultId, session, env, baseRange),
        getFundSpendTrend(vaultId, session, env, {
            ...baseRange,
            compare: 'none',
            granularity: query.granularity,
        }),
        getTemplateBreakdown(vaultId, session, env, baseRange),
    ]);

    return {
        spendTrend,
        categoryTrend,
        categoryBreakdown,
        memberBreakdown,
        paymentTypeBreakdown,
        fundSpendTrend,
        templateBreakdown,
    };
};
