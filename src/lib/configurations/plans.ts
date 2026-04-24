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
    | 'recurring:auto_generation';

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
