export type Entitlement =
    | 'fund:create'
    | 'fund:create_multiple'
    | 'fund:auto_replenishment'
    | 'fund:cycle_history'
    | 'fund:transfer'
    | 'fund:cross_fund_reimbursement'
    | 'recurring:create'
    | 'recurring:create_multiple'
    | 'recurring:custom_interval'
    | 'recurring:auto_generation'
    | 'attachment:scan'
    | 'attachment:multiple'
    | 'expense:export'
    | 'expense:import'
    | 'stats:advanced_breakdowns'
    | 'stats:custom_range'
    | 'stats:export'
    | 'stats:ai_insights';

export interface Plan {
    id: string;
    name: string;
    entitlements: Entitlement[];
}

// Stable plan IDs — safe to use as planId values on vaults.
// If migrated to a DB table later, insert these exact records and all existing vault.planId values resolve as valid FKs.
export const PLANS: Plan[] = [
    {
        id: 'plan_free',
        name: 'Free',
        entitlements: [
            'fund:create',
            'recurring:create',
            'expense:export',
        ],
    },
    {
        id: 'plan_pro',
        name: 'Pro',
        entitlements: [
            'fund:create',
            'fund:create_multiple',
            'fund:auto_replenishment',
            'fund:cycle_history',
            'fund:transfer',
            'fund:cross_fund_reimbursement',
            'recurring:create',
            'recurring:create_multiple',
            'recurring:custom_interval',
            'recurring:auto_generation',
            'attachment:scan',
            'attachment:multiple',
            'expense:export',
            'expense:import',
            'stats:advanced_breakdowns',
            'stats:custom_range',
            'stats:export',
            'stats:ai_insights',
        ],
    },
];

export const FREE_PLAN_ID = 'plan_free';

export function getPlanById(id: string): Plan {
    return PLANS.find(p => p.id === id) ?? PLANS[0]; // fallback to free
}

export function hasEntitlement(planId: string, entitlement: Entitlement): boolean {
    const plan = getPlanById(planId);
    return plan.entitlements.includes(entitlement);
}

// Human-readable copy for each entitlement. Used by the plan/billing screen
// so users see what they actually get, not the internal ID.
export const ENTITLEMENT_LABELS: Record<Entitlement, { name: string; description?: string }> = {
    'fund:create': {
        name: 'One fund per vault',
        description: 'Track a single envelope of money — e.g. groceries or fuel.',
    },
    'fund:create_multiple': {
        name: 'Multiple funds per vault',
        description: 'Split your vault across as many envelopes as you need.',
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
        name: 'Up to 5 recurring expenses',
        description: 'Track subscriptions, bills, or repeating payments — covers most everyday needs.',
    },
    'recurring:create_multiple': {
        name: 'Unlimited recurring expenses',
        description: 'No cap on active rules — track every subscription, installment, and bill.',
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
    'attachment:multiple': {
        name: 'More attachments per expense',
        description: 'Attach up to 20 receipts to a single expense (5 on Free).',
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
