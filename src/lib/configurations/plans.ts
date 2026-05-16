export type Entitlement =
    | 'fund:create'
    | 'fund:auto_replenishment'
    | 'fund:cycle_history'
    | 'fund:transfer'
    | 'fund:cross_fund_reimbursement'
    | 'recurring:create'
    | 'recurring:custom_interval'
    | 'recurring:auto_generation'
    | 'attachment:scan'
    | 'expense:export'
    | 'expense:import'
    | 'stats:advanced_breakdowns'
    | 'stats:custom_range'
    | 'stats:export'
    | 'stats:ai_insights';

export interface PlanLimits {
    // User-level
    maxVaults: number;          // -1 = unlimited
    maxCoveredVaults: number;   // how many vaults this user's Pro can shine onto
    // Vault-level
    maxFundsPerVault: number;
    maxRecurringPerVault: number;
    maxAttachmentsPerExpense: number;
    maxIncomeSourcesPerVault: number;
    maxIncomeTemplatesPerVault: number;
}

export interface Plan {
    id: string;
    name: string;
    entitlements: Entitlement[];
    limits: PlanLimits;
}

// Stable plan IDs — safe to use as planId values on user.
// If migrated to a DB table later, insert these exact records and all existing planId values resolve as valid FKs.
export const PLANS: Plan[] = [
    {
        id: 'plan_free',
        name: 'Free',
        entitlements: [
            'fund:create',
            'recurring:create',
            'expense:export',
        ],
        limits: {
            maxVaults: 1,
            maxCoveredVaults: 1,
            maxFundsPerVault: 1,
            maxRecurringPerVault: 5,
            maxAttachmentsPerExpense: 5,
            maxIncomeSourcesPerVault: 5,
            maxIncomeTemplatesPerVault: 10,
        },
    },
    {
        id: 'plan_pro',
        name: 'Pro',
        entitlements: [
            'fund:create',
            'fund:auto_replenishment',
            'fund:cycle_history',
            'fund:transfer',
            'fund:cross_fund_reimbursement',
            'recurring:create',
            'recurring:custom_interval',
            'recurring:auto_generation',
            'attachment:scan',
            'expense:export',
            'expense:import',
            'stats:advanced_breakdowns',
            'stats:custom_range',
            'stats:export',
            'stats:ai_insights',
        ],
        limits: {
            maxVaults: -1,
            maxCoveredVaults: 5,
            maxFundsPerVault: -1,
            maxRecurringPerVault: -1,
            maxAttachmentsPerExpense: 20,
            maxIncomeSourcesPerVault: -1,
            maxIncomeTemplatesPerVault: -1,
        },
    },
];

export const FREE_PLAN_ID = 'plan_free';
export const PRO_PLAN_ID = 'plan_pro';

export function getPlanById(id: string): Plan {
    return PLANS.find(p => p.id === id) ?? PLANS[0]; // fallback to free
}

export function hasEntitlement(planId: string, entitlement: Entitlement): boolean {
    const plan = getPlanById(planId);
    return plan.entitlements.includes(entitlement);
}

export function getPlanLimit(planId: string, key: keyof PlanLimits): number {
    return getPlanById(planId).limits[key];
}

// Human-readable copy for each entitlement. Used by the plan/billing screen
// so users see what they actually get, not the internal ID.
export const ENTITLEMENT_LABELS: Record<Entitlement, { name: string; description?: string }> = {
    'fund:create': {
        name: 'Funds',
        description: 'Track envelopes of money — e.g. groceries or fuel. Free is limited to one per vault; Pro is unlimited.',
    },
    'fund:auto_replenishment': {
        name: 'Auto-replenishment',
        description: 'Schedule fixed-amount or top-to-ceiling refills automatically.',
    },
    'fund:cycle_history': {
        name: 'Fund cycle history',
        description: 'Review past cycles, not just the current one.',
    },
    'fund:transfer': {
        name: 'Transfer between funds',
        description: 'Move balance from one fund to another in the same vault.',
    },
    'fund:cross_fund_reimbursement': {
        name: 'Cross-fund reimbursements',
        description: 'Settle pending reimbursements across all funds at once.',
    },
    'recurring:create': {
        name: 'Recurring expenses',
        description: 'Track subscriptions, bills, or repeating payments. Free supports up to 5 active rules; Pro is unlimited.',
    },
    'recurring:custom_interval': {
        name: 'Custom recurring intervals',
        description: 'Beyond daily, weekly, monthly, or yearly.',
    },
    'recurring:auto_generation': {
        name: 'Auto-generate recurring expenses',
        description: 'Skip manual entry — recurring items appear on schedule.',
    },
    'attachment:scan': {
        name: 'Scan receipts with AI',
        description: 'Upload a receipt or PDF; auto-fill amount, merchant, date, and category.',
    },
    'expense:export': {
        name: 'Export expenses to CSV',
        description: 'Download your expenses as a spreadsheet — your data, in your hands.',
    },
    'expense:import': {
        name: 'Import expenses from CSV',
        description: 'Bulk-import expenses from a spreadsheet — migrate from another app or backfill history.',
    },
    'stats:advanced_breakdowns': {
        name: 'Advanced breakdowns',
        description: 'Year-over-year comparison, tag-level analytics, and the day/hour spending heatmap.',
    },
    'stats:custom_range': {
        name: 'Unlimited stats history',
        description: 'See trends beyond the last 12 months — compare years, not just months.',
    },
    'stats:export': {
        name: 'Export charts and reports',
        description: 'Download any chart as PNG or any aggregated breakdown as CSV.',
    },
    'stats:ai_insights': {
        name: 'AI insights on statistics',
        description: 'Plain-English reading of what changed this period — drivers, movers, and outliers.',
    },
};
