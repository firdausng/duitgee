import type {
    AllowanceLine,
    DeductionLine,
    EntryBreakdownLine,
} from '$lib/schemas/income';

// Structural shape the helper actually needs — keeps generic inference
// out of valibot's union/optional gymnastics.
type BreakdownLineLike = {
    mode: 'percent' | 'fixed';
    rate?: number;
    amount?: number;
};

/**
 * Resolve a breakdown line's effective amount against a base figure.
 *   - mode='percent' → round(base * rate, 2)
 *   - mode='fixed'   → amount as-is
 *
 * Returns a new array of lines stamped with `computedAmount`. Used for both
 * allowances (base = baseAmount) and deductions (base = gross).
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
 * Resolve a full salary breakdown in the right order:
 *   1. Allowances compute against `baseAmount`
 *   2. Gross = baseAmount + sum(allowances.computedAmount)
 *   3. Deductions compute against `gross`
 *
 * Returns the computed gross and both resolved line sets ready to snapshot
 * onto the income entry. `baseAmount`, `allowances`, `deductions` are all
 * optional — when omitted (entry has no breakdown), gross falls back to the
 * caller's responsibility (typically the user-entered amount).
 */
export function resolveBreakdown(
    baseAmount: number,
    allowances: AllowanceLine[] = [],
    deductions: DeductionLine[] = [],
): {
    gross: number;
    resolvedAllowances: EntryBreakdownLine[];
    resolvedDeductions: EntryBreakdownLine[];
} {
    const resolvedAllowances = resolveLines(allowances, baseAmount) as EntryBreakdownLine[];
    const gross =
        Math.round(
            (baseAmount + resolvedAllowances.reduce((s, a) => s + a.computedAmount, 0)) * 100,
        ) / 100;
    const resolvedDeductions = resolveLines(deductions, gross) as EntryBreakdownLine[];
    return { gross, resolvedAllowances, resolvedDeductions };
}

/**
 * Serialize a breakdown array for JSON-column storage. Returns null for
 * empty/missing arrays so the column stays cleanly NULL rather than '[]'.
 */
export function serializeBreakdown(
    lines: unknown[] | null | undefined,
): string | null {
    if (!lines || lines.length === 0) return null;
    return JSON.stringify(lines);
}

/**
 * Parse a breakdown JSON column. Returns null when the column is null or the
 * stored string is empty/invalid; the caller decides whether to treat that as
 * "no breakdown" or an empty array.
 */
export function parseBreakdown<T = EntryBreakdownLine>(raw: string | null): T[] | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed as T[];
    } catch {
        return null;
    }
}
