import * as v from 'valibot';

// Free vaults can see at most this many months of trend history. The trend
// endpoints clamp `start` to `now - FREE_HISTORY_MONTHS` for free vaults.
export const FREE_HISTORY_MONTHS = 12;

export const granularitySchema = v.picklist(['day', 'week', 'month']);
export type Granularity = v.InferOutput<typeof granularitySchema>;

const baseRangeSchema = v.object({
    vaultId: v.string(),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
});

export const spendTrendQuerySchema = v.object({
    ...baseRangeSchema.entries,
    granularity: v.optional(granularitySchema),
    /** When 'prev', also returns an equal-length previous-period series. */
    compare: v.optional(v.picklist(['none', 'prev']), 'none'),
});
export type SpendTrendQuery = v.InferOutput<typeof spendTrendQuerySchema>;

export const dashboardQuerySchema = v.object({
    ...baseRangeSchema.entries,
    granularity: v.optional(granularitySchema),
    compare: v.optional(v.picklist(['none', 'prev']), 'none'),
    includeNetPosition: v.optional(
        v.pipe(v.string(), v.transform((s) => s === 'true')),
        'false',
    ),
    topN: v.optional(v.pipe(v.string(), v.transform(Number)), '5'),
});
export type DashboardQuerySchema = v.InferOutput<typeof dashboardQuerySchema>;

export const categoryTrendQuerySchema = v.object({
    ...baseRangeSchema.entries,
    granularity: v.optional(granularitySchema),
    /** Default 5; rest rolled into "Other". */
    topN: v.optional(v.pipe(v.string(), v.transform(Number)), '5'),
});
export type CategoryTrendQuery = v.InferOutput<typeof categoryTrendQuerySchema>;

export const breakdownQuerySchema = baseRangeSchema;
export type BreakdownQuery = v.InferOutput<typeof breakdownQuerySchema>;

export const memberBreakdownQuerySchema = v.object({
    ...baseRangeSchema.entries,
    /** Pro: include member net-position math (paid - expected even share). */
    includeNetPosition: v.optional(v.pipe(v.string(), v.transform((s) => s === 'true')), 'false'),
});
export type MemberBreakdownQuery = v.InferOutput<typeof memberBreakdownQuerySchema>;

export const yearOverYearQuerySchema = v.object({
    vaultId: v.string(),
    /** Comma-separated years, e.g. "2024,2025,2026". */
    years: v.string(),
});
export type YearOverYearQuery = v.InferOutput<typeof yearOverYearQuerySchema>;

export const tagBreakdownQuerySchema = v.object({
    ...baseRangeSchema.entries,
    topN: v.optional(v.pipe(v.string(), v.transform(Number)), '10'),
});
export type TagBreakdownQuery = v.InferOutput<typeof tagBreakdownQuerySchema>;

// Response shapes — exported so the client can type its fetches.
export interface TrendBucket {
    bucket: string;
    total: number;
    count: number;
}

export interface SpendTrendResponse {
    granularity: Granularity;
    current: TrendBucket[];
    previous: TrendBucket[] | null;
    truncated: boolean; // true when free-tier history clamp shortened the range
}

export interface CategoryTrendResponse {
    granularity: Granularity;
    /** Sorted descending by total spend across the range. */
    series: Array<{
        categoryName: string;
        categoryIcon: string | null;
        categoryColor: string | null;
        totalAmount: number;
        buckets: TrendBucket[];
    }>;
    /** "Other" rollup of categories beyond topN. Empty array if none. */
    other: TrendBucket[];
}

export interface CategoryBreakdownItem {
    categoryName: string;
    categoryIcon: string | null;
    categoryColor: string | null;
    totalAmount: number;
    count: number;
}

export interface MemberBreakdownItem {
    userId: string | null;
    displayName: string;
    totalAmount: number;
    count: number;
    /** Present only when includeNetPosition=true. */
    expectedShare?: number;
    /** Positive = paid more than fair share; negative = owes. */
    net?: number;
}

export interface PaymentTypeBreakdownItem {
    paymentType: string;
    totalAmount: number;
    count: number;
}

export interface TemplateBreakdownItem {
    /** Null = expenses with no template attached. */
    templateId: string | null;
    templateName: string;
    templateIcon: string | null;
    totalAmount: number;
    count: number;
}

export interface FundSpendBucket {
    fundId: string;
    fundName: string;
    fundIcon: string | null;
    fundColor: string | null;
    buckets: TrendBucket[];
    totalAmount: number;
}

export interface FundSpendTrendResponse {
    granularity: Granularity;
    funds: FundSpendBucket[];
}
