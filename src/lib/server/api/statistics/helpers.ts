import { sql } from 'drizzle-orm';
import { differenceInDays, subMonths, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import type { SQL } from 'drizzle-orm';
import { expenses } from '$lib/server/db/schema';
import { checkVaultEntitlement } from '$lib/server/utils/entitlements';
import { FREE_HISTORY_MONTHS, type Granularity } from '$lib/schemas/statistics';

/**
 * Map a date range to a sensible bucket granularity. The auto-pick keeps trend
 * charts readable: never show 730 daily bars for a 2-year range.
 */
export const pickGranularity = (
    start: Date,
    end: Date,
    override?: Granularity,
): Granularity => {
    if (override) return override;
    const days = differenceInDays(end, start);
    if (days <= 45) return 'day';
    if (days <= 180) return 'week';
    return 'month';
};

/**
 * SQL fragment that buckets the expenses.date column. Uses SQLite's strftime;
 * %W is week-of-year (Sun-start) — adequate for chart labels (we render the
 * label client-side using the bucket's first date) but be aware ISO weeks
 * differ. Document the choice rather than fighting strftime.
 */
export const bucketDateExpr = (granularity: Granularity): SQL<string> => {
    switch (granularity) {
        case 'day':
            return sql<string>`strftime('%Y-%m-%d', ${expenses.date})`;
        case 'week':
            return sql<string>`strftime('%Y-W%W', ${expenses.date})`;
        case 'month':
            return sql<string>`strftime('%Y-%m', ${expenses.date})`;
    }
};

/**
 * For free-tier vaults, clamp the start of the requested range to
 * `now - FREE_HISTORY_MONTHS`. Returns the effective start (string ISO) and a
 * `truncated` flag the client uses to render an upsell.
 */
export const clampHistoryForFree = async (
    vaultId: string,
    requestedStart: string | undefined,
    env: Cloudflare.Env,
): Promise<{ start: string | undefined; truncated: boolean }> => {
    const allowed = await checkVaultEntitlement(vaultId, 'stats:custom_range', env);
    if (allowed) return { start: requestedStart, truncated: false };

    const cutoff = formatISO(subMonths(new UTCDate(), FREE_HISTORY_MONTHS));
    if (!requestedStart) return { start: cutoff, truncated: false };
    if (requestedStart < cutoff) return { start: cutoff, truncated: true };
    return { start: requestedStart, truncated: false };
};

/**
 * Return an equal-length window immediately before the given range. Used for
 * the "compare to previous period" overlay.
 */
export const previousPeriod = (
    start: string,
    end: string,
): { start: string; end: string } => {
    const s = new Date(start);
    const e = new Date(end);
    const ms = e.getTime() - s.getTime();
    const prevEnd = new Date(s.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - ms);
    return {
        start: prevStart.toISOString(),
        end: prevEnd.toISOString(),
    };
};

/**
 * Default range when caller didn't supply one — last 30 days inclusive.
 */
export const defaultRange = (): { start: string; end: string } => {
    const end = new UTCDate();
    const start = new UTCDate(end);
    start.setUTCDate(start.getUTCDate() - 30);
    return {
        start: formatISO(start),
        end: formatISO(end),
    };
};
