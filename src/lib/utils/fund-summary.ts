/**
 * Fund summary helpers — compute the numbers shown on the fund detail
 * "budget hero" (% used, days left, projected end-of-cycle spend) and the
 * plain-English replenishment policy line.
 *
 * All math lives here so the fund detail page + funds list card can share
 * the same source of truth.
 */

export interface FundLike {
    balance: number;
    status?: string | null;
    color?: string | null;
    icon?: string | null;
}

export interface CycleLike {
    periodStart: string;
    periodEnd: string;
    openingBalance?: number | null;
    topUpAmount?: number | null;
    totalSpent?: number | null;
    totalDeducted?: number | null;
    totalReimbursed?: number | null;
}

export interface PolicyLike {
    replenishmentType: 'manual' | 'fixed_amount' | 'top_to_ceiling' | string;
    replenishmentAmount?: number | null;
    ceilingAmount?: number | null;
    replenishmentSchedule?: 'monthly' | 'biweekly' | 'weekly' | null | string;
    carryOverBalance?: number | boolean | null;
    carryOverFundId?: string | null;
}

export interface FundSummary {
    /** Net outflow: expenses + deductions − reimbursements. */
    spent: number;
    /** Opening balance + all top-ups this cycle. */
    budget: number;
    /** spent / budget, clamped 0..1. Null when budget is 0. */
    percentUsed: number | null;
    /** Manual funds have no cycle boundary — render a different variant. */
    isManual: boolean;
    /** Days left in the current cycle. Null for manual funds. */
    daysLeft: number | null;
    /** Total days from periodStart → periodEnd. Null for manual. */
    totalDays: number | null;
    /** Days elapsed since periodStart. Null for manual. */
    daysElapsed: number | null;
    /** Projected spend at cycle end based on current burn rate. Null when
     *  projection isn't meaningful yet (first 3 days of a cycle). */
    projectedSpend: number | null;
    /** True when projected > budget and budget > 0. */
    projectedOver: boolean;
}

const MANUAL_SENTINEL_YEAR = '2099';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse an ISO string; returns null on invalid input. */
function parseISO(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
}

function isManualCycle(cycle: CycleLike | null | undefined, policy: PolicyLike | null | undefined): boolean {
    if (policy?.replenishmentSchedule == null) return true;
    if (cycle?.periodEnd?.startsWith(MANUAL_SENTINEL_YEAR)) return true;
    return false;
}

export function computeFundSummary(
    fund: FundLike,
    cycle: CycleLike | null | undefined,
    policy: PolicyLike | null | undefined,
    now: Date = new Date(),
): FundSummary {
    const spent =
        (cycle?.totalSpent ?? 0) +
        (cycle?.totalDeducted ?? 0) -
        (cycle?.totalReimbursed ?? 0);
    const budget = (cycle?.openingBalance ?? 0) + (cycle?.topUpAmount ?? 0);
    const percentUsed = budget > 0 ? Math.min(1, Math.max(0, spent / budget)) : null;
    const manual = isManualCycle(cycle, policy);

    let daysLeft: number | null = null;
    let totalDays: number | null = null;
    let daysElapsed: number | null = null;
    let projectedSpend: number | null = null;
    let projectedOver = false;

    if (!manual && cycle) {
        const start = parseISO(cycle.periodStart);
        const end = parseISO(cycle.periodEnd);
        if (start && end) {
            totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));
            daysElapsed = Math.max(0, Math.min(totalDays, Math.floor((now.getTime() - start.getTime()) / MS_PER_DAY)));
            daysLeft = Math.max(0, totalDays - daysElapsed);

            // Projection only meaningful after 3 days of history.
            if (daysElapsed >= 3 && budget > 0) {
                projectedSpend = (spent / daysElapsed) * totalDays;
                projectedOver = projectedSpend > budget;
            }
        }
    }

    return {
        spent,
        budget,
        percentUsed,
        isManual: manual,
        daysLeft,
        totalDays,
        daysElapsed,
        projectedSpend,
        projectedOver,
    };
}

/**
 * Compute the next refill date based on the current cycle's period end +
 * the policy schedule.
 *
 * The active cycle's periodEnd IS the next refill boundary — the cron job
 * rolls the cycle at periodEnd and runs auto-replenishment on the new cycle.
 * So "next refill" is simply the current cycle's end (+1 day to land on the
 * new cycle's start).
 */
export function nextRefillDate(
    cycle: CycleLike | null | undefined,
    policy: PolicyLike | null | undefined,
): Date | null {
    if (!cycle || !policy) return null;
    if (policy.replenishmentSchedule == null) return null;
    if (cycle.periodEnd?.startsWith(MANUAL_SENTINEL_YEAR)) return null;
    const end = parseISO(cycle.periodEnd);
    if (!end) return null;
    return new Date(end.getTime() + MS_PER_DAY);
}

/**
 * Render the replenishment policy as a single plain-English sentence.
 * Pair with `nextRefillDate()` + a date formatter in the UI for the
 * "Next refill in N days" annotation.
 */
export function policySummary(
    policy: PolicyLike | null | undefined,
    fund: FundLike,
    format: (n: number) => string,
    carryOverFundName?: string | null,
): string {
    if (!policy) return 'No replenishment policy configured.';

    const type = policy.replenishmentType;
    const schedule = policy.replenishmentSchedule;

    const scheduleLabel = (() => {
        switch (schedule) {
            case 'monthly': return 'every month';
            case 'biweekly': return 'every two weeks';
            case 'weekly': return 'every week';
            default: return '';
        }
    })();

    let base = '';
    if (type === 'manual' || !schedule) {
        base = 'Manual top-ups only.';
    } else if (type === 'fixed_amount') {
        const amt = policy.replenishmentAmount ?? 0;
        base = `Adds ${format(amt)} ${scheduleLabel}.`;
    } else if (type === 'top_to_ceiling') {
        const ceil = policy.ceilingAmount ?? 0;
        const toAdd = Math.max(0, ceil - fund.balance);
        base = `Tops up to ${format(ceil)} ${scheduleLabel}.`;
        if (toAdd > 0) base += ` Would add ${format(toAdd)} now.`;
    } else {
        base = `Replenishment type: ${type}.`;
    }

    if (policy.carryOverBalance && policy.carryOverFundId) {
        const target = carryOverFundName ?? 'another fund';
        base += ` Leftover rolls to ${target}.`;
    }

    return base;
}

/**
 * Human-friendly "N days" phrasing for the next-refill chip.
 */
export function daysUntilPhrase(target: Date | null, now: Date = new Date()): string | null {
    if (!target) return null;
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return 'Any moment';
    const days = Math.ceil(diffMs / MS_PER_DAY);
    if (days === 1) return 'tomorrow';
    if (days <= 7) return `in ${days} days`;
    return `in ${days} days`;
}
