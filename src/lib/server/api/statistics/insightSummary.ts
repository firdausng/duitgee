import type { StatisticsDashboardResponse } from './getStatisticsDashboardHandler';
import type { AiInsightOutput } from '$lib/schemas/statisticsInsights';
import type { MonthlyHistoryResult } from './getMonthlyHistory';
import type { AnomalyItem } from './detectAnomalies';

/**
 * Compact projection of the dashboard payload tailored for the LLM. Keeps the
 * input shape predictable, caps each list at 3-5 items, and never includes raw
 * expense rows — only pre-aggregated figures.
 */
export interface LlmDashboardSummary {
    period: { start: string; end: string; label: string };
    currency: string;
    totals: {
        current: number;
        previous: number | null;
        deltaPct: number | null;
        deltaAbs: number | null;
    };
    topCategories: Array<{
        name: string;
        current: number;
        share: number;
    }>;
    topMovers: Array<{
        name: string;
        deltaAbs: number;
    }>;
    topMembers: Array<{
        name: string;
        paid: number;
        share: number;
        net?: number;
    }>;
    topPaymentTypes: Array<{
        type: string;
        amount: number;
        share: number;
    }>;
    topFunds: Array<{
        name: string;
        spent: number;
        count: number;
    }>;
    topTemplates: Array<{
        name: string;
        spent: number;
        count: number;
    }>;
    /**
     * Last 6 months of overall spend, oldest first. Lets the LLM spot
     * sustained trends ("3 months running") that a single-period comparison
     * can't see. Empty array if no history.
     */
    monthlyHistory: Array<{ month: string; total: number }>;
    /**
     * Per-category 6-month series for the top current-period categories.
     * Each entry's `monthly` array is aligned 1:1 with `monthlyHistory[].month`.
     */
    categoryHistory: Array<{
        name: string;
        monthly: number[];
    }>;
    /**
     * Transaction-level outliers detected by z-score against a 90-day per-category
     * baseline. Up to 5, ranked by significance. Empty when there's no baseline data.
     */
    anomalies: Array<{
        amount: number;
        categoryName: string;
        date: string;
        paidByName: string | null;
        note: string | null;
        multiple: number;
        categoryAverage: number;
    }>;
    /**
     * Set when the vault has unidentified expenses sitting around. The LLM can
     * mention this once if material — don't make every bullet about it.
     */
    unidentifiedReminder: {
        count: number;
        totalAmount: number;
    } | null;
}

const truncate = (s: string, n = 32) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const sumBuckets = (buckets: { total: number }[]) => buckets.reduce((s, b) => s + b.total, 0);

const round = (n: number, decimals = 2): number => {
    const f = 10 ** decimals;
    return Math.round(n * f) / f;
};

/**
 * Compress the full dashboard payload into a small structured summary suitable
 * for an LLM prompt. Drops anything the LLM can't usefully reason about (chart
 * coordinates, full lists, irrelevant fields).
 */
export const summarizeDashboardForLlm = (
    payload: StatisticsDashboardResponse,
    period: { start: string; end: string },
    currency: string,
    history?: MonthlyHistoryResult,
    anomalies?: AnomalyItem[],
    unidentified?: { count: number; totalAmount: number },
): LlmDashboardSummary => {
    const currentTotal = sumBuckets(payload.spendTrend.current);
    const previousTotal = payload.spendTrend.previous
        ? sumBuckets(payload.spendTrend.previous)
        : null;
    const deltaAbs = previousTotal !== null ? currentTotal - previousTotal : null;
    const deltaPct =
        previousTotal !== null && previousTotal !== 0
            ? ((currentTotal - previousTotal) / previousTotal) * 100
            : null;

    // Top movers — categories with the largest absolute deltas vs prev period.
    // We approximate previous-period per-category from the trend data we already
    // have, treating any category not present in previous as 0.
    const movers: Array<{ name: string; deltaAbs: number }> = (() => {
        const prevByCat = new Map<string, number>(); // intentionally empty for v1
        // We don't have previous-period per-category data on-hand without an
        // extra round trip; surface the largest current categories instead and
        // let the LLM reason from current+previous totals. A future iteration
        // can add per-category prev-period via a dedicated query.
        const items = payload.categoryTrend.series.map((s) => ({
            name: truncate(s.categoryName),
            deltaAbs: s.totalAmount - (prevByCat.get(s.categoryName) ?? 0),
        }));
        return items.slice(0, 3);
    })();

    return {
        period: {
            start: period.start.slice(0, 10),
            end: period.end.slice(0, 10),
            label: `${period.start.slice(0, 10)} to ${period.end.slice(0, 10)}`,
        },
        currency,
        totals: {
            current: round(currentTotal),
            previous: previousTotal !== null ? round(previousTotal) : null,
            deltaPct: deltaPct !== null ? round(deltaPct, 1) : null,
            deltaAbs: deltaAbs !== null ? round(deltaAbs) : null,
        },
        topCategories: payload.categoryBreakdown
            .slice(0, 5)
            .map((c) => ({
                name: truncate(c.categoryName),
                current: round(c.totalAmount),
                share: currentTotal > 0 ? round(c.totalAmount / currentTotal, 3) : 0,
            })),
        topMovers: movers,
        topMembers: payload.memberBreakdown.slice(0, 3).map((m) => ({
            name: truncate(m.displayName),
            paid: round(m.totalAmount),
            share: currentTotal > 0 ? round(m.totalAmount / currentTotal, 3) : 0,
            ...(m.net !== undefined ? { net: round(m.net) } : {}),
        })),
        topPaymentTypes: payload.paymentTypeBreakdown.slice(0, 3).map((p) => ({
            type: p.paymentType,
            amount: round(p.totalAmount),
            share: currentTotal > 0 ? round(p.totalAmount / currentTotal, 3) : 0,
        })),
        topFunds: payload.fundSpendTrend.funds.slice(0, 3).map((f) => ({
            name: truncate(f.fundName),
            spent: round(f.totalAmount),
            count: f.buckets.reduce((s, b) => s + b.count, 0),
        })),
        topTemplates: payload.templateBreakdown.slice(0, 3).map((t) => ({
            name: truncate(t.templateName),
            spent: round(t.totalAmount),
            count: t.count,
        })),
        monthlyHistory: (history?.overall ?? []).map((p) => ({
            month: p.month,
            total: round(p.total),
        })),
        categoryHistory: (() => {
            if (!history) return [];
            const months = history.overall.map((p) => p.month);
            // Pivot: top 5 categories by current-period total → 6-month series each.
            const topNames = payload.categoryBreakdown.slice(0, 5).map((c) => c.categoryName);
            const lookup = new Map<string, Map<string, number>>(); // name → month → total
            for (const row of history.byCategory) {
                let inner = lookup.get(row.categoryName);
                if (!inner) {
                    inner = new Map();
                    lookup.set(row.categoryName, inner);
                }
                inner.set(row.month, row.total);
            }
            return topNames.map((name) => ({
                name: truncate(name),
                monthly: months.map((m) => round(lookup.get(name)?.get(m) ?? 0)),
            }));
        })(),
        anomalies: (anomalies ?? []).map((a) => ({
            amount: a.amount,
            categoryName: truncate(a.categoryName),
            date: a.date,
            paidByName: a.paidByName ? truncate(a.paidByName, 24) : null,
            note: a.note,
            multiple: a.multiple,
            categoryAverage: a.categoryAverage,
        })),
        unidentifiedReminder:
            unidentified && unidentified.count > 0
                ? {
                      count: unidentified.count,
                      totalAmount: round(unidentified.totalAmount),
                  }
                : null,
    };
};

/**
 * Defensive filter: extract numeric tokens from each bullet's detail and verify
 * they appear (within 1% tolerance) somewhere in the source summary. Drops any
 * bullet that cites a number not grounded in the data — last-line guard against
 * hallucination.
 */
export const filterUngroundedBullets = (
    output: AiInsightOutput,
    summary: LlmDashboardSummary,
): AiInsightOutput => {
    const groundedNumbers: number[] = [];
    const collect = (n: number | null | undefined) => {
        if (n !== null && n !== undefined && Number.isFinite(n)) groundedNumbers.push(Math.abs(n));
    };

    collect(summary.totals.current);
    collect(summary.totals.previous);
    collect(summary.totals.deltaAbs);
    collect(summary.totals.deltaPct);
    for (const c of summary.topCategories) {
        collect(c.current);
        collect(c.share * 100);
    }
    for (const m of summary.topMovers) collect(m.deltaAbs);
    for (const m of summary.topMembers) {
        collect(m.paid);
        collect(m.share * 100);
        if (m.net !== undefined) collect(m.net);
    }
    for (const p of summary.topPaymentTypes) {
        collect(p.amount);
        collect(p.share * 100);
    }
    for (const f of summary.topFunds) {
        collect(f.spent);
        collect(f.count);
    }
    for (const t of summary.topTemplates) {
        collect(t.spent);
        collect(t.count);
    }
    for (const m of summary.monthlyHistory) collect(m.total);
    for (const c of summary.categoryHistory) for (const v of c.monthly) collect(v);
    for (const a of summary.anomalies) {
        collect(a.amount);
        collect(a.multiple);
        collect(a.categoryAverage);
    }
    if (summary.unidentifiedReminder) {
        collect(summary.unidentifiedReminder.count);
        collect(summary.unidentifiedReminder.totalAmount);
    }

    // Numbers under 5 are usually counts/percents/small qualifiers — treat as
    // uncontroversial. Big numbers we hold to a 1% tolerance against the
    // grounded set.
    const isGrounded = (n: number): boolean => {
        const abs = Math.abs(n);
        if (abs < 5) return true;
        return groundedNumbers.some((g) => {
            if (g === 0) return abs < 1;
            return Math.abs(abs - g) / g <= 0.01;
        });
    };

    const numberPattern = /-?\d+(?:\.\d+)?/g;

    const filtered = output.bullets.filter((bullet) => {
        const text = `${bullet.title} ${bullet.detail}`;
        const matches = text.match(numberPattern) ?? [];
        for (const m of matches) {
            const n = Number(m);
            if (!Number.isFinite(n)) continue;
            if (!isGrounded(n)) return false;
        }
        return true;
    });

    return {
        ...output,
        bullets: filtered,
    };
};

/** Compute a stable cache key for a vault + period. */
export const computeInsightCacheKey = async (
    vaultId: string,
    periodStart: string,
    periodEnd: string,
): Promise<string> => {
    // Day-precision normalize so insights are reused across same-day requests.
    const normStart = periodStart.slice(0, 10);
    const normEnd = periodEnd.slice(0, 10);
    const input = `${vaultId}|${normStart}|${normEnd}`;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};
