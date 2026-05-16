import type { EntryBreakdownLine } from '$lib/schemas/income';
import {
    resolveLines as resolveLinesCore,
    resolveBreakdown as resolveBreakdownCore,
} from '$lib/utils/breakdown';

// Re-export the shared client-safe math under the original names so existing
// server callers (handlers + cron engine) need no changes. The wrappers cast
// the generic result back to the snapshot type the JSON columns expect.

export const resolveLines = resolveLinesCore;

export function resolveBreakdown(
    baseAmount: number,
    allowances: Parameters<typeof resolveBreakdownCore>[1] = [],
    deductions: Parameters<typeof resolveBreakdownCore>[2] = [],
): {
    gross: number;
    resolvedAllowances: EntryBreakdownLine[];
    resolvedDeductions: EntryBreakdownLine[];
} {
    const r = resolveBreakdownCore(baseAmount, allowances, deductions);
    return {
        gross: r.gross,
        resolvedAllowances: r.resolvedAllowances as EntryBreakdownLine[],
        resolvedDeductions: r.resolvedDeductions as EntryBreakdownLine[],
    };
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
