import { parseISO } from 'date-fns';

export type ScheduleUnit = 'day' | 'week' | 'month' | 'year';

/** Minimal rule shape needed by the helpers — both /recurring and /home pass this. */
export interface RecurringRule {
    id: string;
    name: string | null;
    scheduleUnit: ScheduleUnit;
    scheduleInterval: number;
    anchorDate: string;
    amountOverride: number | null;
    endAfterCount: number | null;
    status: 'active' | 'paused' | 'ended';
    template: {
        name: string | null;
        icon: string | null;
        defaultAmount: number | null;
    };
    progress: {
        paidCount: number;
        paidAmount: number;
        totalAmount: number | null;
        finalOccurrenceAt: string | null;
    };
}

/** Effective amount = override if set, else template default, else 0. */
export function ruleAmount(rule: Pick<RecurringRule, 'amountOverride' | 'template'>): number {
    return rule.amountOverride ?? rule.template.defaultAmount ?? 0;
}

export function ordinal(n: number): string {
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return 'th';
    switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

/**
 * Human-readable schedule label like "Monthly on the 5th", "Every 2 weeks".
 *
 * @param locale used to format weekday/month names
 */
export function scheduleLabel(
    rule: Pick<RecurringRule, 'scheduleUnit' | 'scheduleInterval' | 'anchorDate'>,
    locale: string,
): string {
    const { scheduleUnit, scheduleInterval, anchorDate } = rule;
    const unitMap = { day: 'day', week: 'week', month: 'month', year: 'year' } as const;
    const unitPlural = (n: number, u: string) => (n === 1 ? u : `${u}s`);

    if (scheduleInterval === 1) {
        if (scheduleUnit === 'day') return 'Daily';
        if (scheduleUnit === 'week') {
            const dow = parseISO(anchorDate).toLocaleDateString(locale, { weekday: 'long' });
            return `Weekly on ${dow}`;
        }
        if (scheduleUnit === 'month') {
            const dom = parseISO(anchorDate).getDate();
            return `Monthly on the ${dom}${ordinal(dom)}`;
        }
        if (scheduleUnit === 'year') {
            const d = parseISO(anchorDate);
            return `Yearly on ${d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`;
        }
    }
    return `Every ${scheduleInterval} ${unitPlural(scheduleInterval, unitMap[scheduleUnit])}`;
}

/**
 * Convert a rule's effective amount to its monthly-equivalent commit.
 *
 * Annualizes weekly/yearly rules so they compare apples-to-apples with monthly
 * subscriptions:
 *   daily   → amount × (30 / interval)
 *   weekly  → amount × (52/12 / interval)   ≈ 4.333× / interval
 *   monthly → amount / interval
 *   yearly  → amount / (12 × interval)
 */
export function monthlyEquivalent(
    rule: Pick<RecurringRule, 'scheduleUnit' | 'scheduleInterval' | 'amountOverride' | 'template'>,
): number {
    const amount = ruleAmount(rule);
    const occurrencesPerMonth = (() => {
        switch (rule.scheduleUnit) {
            case 'day':   return 30 / rule.scheduleInterval;
            case 'week':  return (52 / 12) / rule.scheduleInterval;
            case 'month': return 1 / rule.scheduleInterval;
            case 'year':  return 1 / (12 * rule.scheduleInterval);
        }
    })();
    return amount * occurrencesPerMonth;
}

export interface SubscriptionSummary {
    /** Active subscription count (no end-after-count, status === active). */
    active: number;
    /** Sum of monthly-equivalent commits across active subscriptions. */
    monthlyCommit: number;
}

export function subscriptionSummary(rules: RecurringRule[]): SubscriptionSummary {
    const active = rules.filter((r) => r.endAfterCount === null && r.status === 'active');
    const monthlyCommit = active.reduce((sum, r) => sum + monthlyEquivalent(r), 0);
    return { active: active.length, monthlyCommit };
}

export interface InstallmentSummary {
    /** Active installment count (status !== ended). */
    active: number;
    /** Monthly commit across active installments. */
    monthlyCommit: number;
    /** Sum of `progress.paidAmount` across all installments (active + ended). */
    paidAmount: number;
    /** Sum of `progress.totalAmount` across all installments. */
    totalAmount: number;
    /** Rounded percentage of paid / total — 0 when total is 0. */
    pct: number;
}

export function installmentSummary(rules: RecurringRule[]): InstallmentSummary {
    const installments = rules.filter((r) => r.endAfterCount !== null);
    const active = installments.filter((r) => r.status !== 'ended');
    const monthlyCommit = active.reduce((sum, r) => sum + monthlyEquivalent(r), 0);
    const paidAmount = installments.reduce((sum, r) => sum + r.progress.paidAmount, 0);
    const totalAmount = installments.reduce((sum, r) => sum + (r.progress.totalAmount ?? 0), 0);
    const pct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
    return { active: active.length, monthlyCommit, paidAmount, totalAmount, pct };
}

export interface RemainingAmount {
    /** Outstanding balance in the rule's currency. */
    value: number;
    /**
     * `declared` — `totalAmount − paidAmount` (rule was set up with a fixed total like a loan).
     * `estimated` — `remaining_count × per_period_amount` (no declared total — best-effort projection).
     */
    source: 'declared' | 'estimated';
}

/**
 * Outstanding balance for an installment rule.
 *
 * For non-installment rules (no end-after-count), returns 0/estimated.
 * For ended rules, returns 0/declared.
 *
 * Caller should clamp negative results to 0 (can happen if user over-paid before
 * the rule was marked ended).
 */
export function remainingAmount(rule: RecurringRule): RemainingAmount {
    if (rule.endAfterCount === null) {
        return { value: 0, source: 'estimated' };
    }
    if (rule.status === 'ended') {
        return { value: 0, source: 'declared' };
    }

    const declaredTotal = rule.progress.totalAmount;
    if (declaredTotal != null && declaredTotal > 0) {
        return {
            value: Math.max(0, declaredTotal - rule.progress.paidAmount),
            source: 'declared',
        };
    }

    const remainingCount = Math.max(0, rule.endAfterCount - rule.progress.paidCount);
    return {
        value: remainingCount * ruleAmount(rule),
        source: 'estimated',
    };
}

/**
 * Active installments sorted by closest to completion — earliest finalOccurrenceAt first,
 * with a fewest-remaining tiebreaker. Mirrors the "Almost finished" sort on /recurring.
 *
 * Limited to `limit` results (default 2) for compact dashboard surfaces.
 */
export function topInstallmentsAlmostFinished(
    rules: RecurringRule[],
    limit = 2,
): RecurringRule[] {
    const active = rules.filter(
        (r) => r.endAfterCount !== null && r.status !== 'ended',
    );
    return [...active]
        .sort((a, b) => {
            const aEnd = a.progress.finalOccurrenceAt ?? '￿';
            const bEnd = b.progress.finalOccurrenceAt ?? '￿';
            if (aEnd !== bEnd) return aEnd.localeCompare(bEnd);
            const aRem = (a.endAfterCount ?? 0) - a.progress.paidCount;
            const bRem = (b.endAfterCount ?? 0) - b.progress.paidCount;
            return aRem - bRem;
        })
        .slice(0, limit);
}
