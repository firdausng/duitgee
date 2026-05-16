/**
 * Pure math for salary breakdown lines — shared by server handlers AND the
 * client-side scenario planner.
 *
 * The server-only counterpart in `src/lib/server/api/income/breakdownHelpers.ts`
 * adds JSON serialize/parse helpers tied to the DB columns; those stay there.
 * The numeric core lives here so the browser can recompute live without a
 * server round-trip on every override toggle.
 */

export type BreakdownLineLike = {
    mode: 'percent' | 'fixed';
    rate?: number;
    amount?: number;
};

/**
 * Resolve a list of breakdown lines against a base figure, stamping each line
 * with its computed amount (2dp rounded).
 *   - mode='percent' → round(base * rate, 2)
 *   - mode='fixed'   → amount as-is
 */
export function resolveLines<T extends BreakdownLineLike>(
    lines: T[],
    base: number,
): Array<T & { computedAmount: number }> {
    return lines.map((l) => ({
        ...l,
        computedAmount:
            l.mode === 'percent'
                ? Math.round(base * (l.rate ?? 0) * 100) / 100
                : (l.amount ?? 0),
    }));
}

/**
 * Resolve a full payslip-shape breakdown:
 *   gross = baseAmount + sum(allowances.computedAmount)
 *   deductions then resolve against gross.
 */
export function resolveBreakdown(
    baseAmount: number,
    allowances: BreakdownLineLike[] = [],
    deductions: BreakdownLineLike[] = [],
) {
    const resolvedAllowances = resolveLines(allowances, baseAmount);
    const gross =
        Math.round(
            (baseAmount + resolvedAllowances.reduce((s, a) => s + a.computedAmount, 0)) * 100,
        ) / 100;
    const resolvedDeductions = resolveLines(deductions, gross);
    const deductionsTotal =
        Math.round(resolvedDeductions.reduce((s, d) => s + d.computedAmount, 0) * 100) / 100;
    const net = Math.round((gross - deductionsTotal) * 100) / 100;
    return { gross, resolvedAllowances, resolvedDeductions, deductionsTotal, net };
}
