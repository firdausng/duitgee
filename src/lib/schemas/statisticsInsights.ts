import * as v from 'valibot';

// Per-vault monthly cap on insight generations. Mirrors the daily cap pattern in
// scanAttachmentHandler — coarse abuse guardrail, not a precise SLA.
export const INSIGHTS_MONTHLY_LIMIT = 30;

export const getStatisticsInsightsQuerySchema = v.object({
    vaultId: v.string(),
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    /** Bypass cache and regenerate. */
    refresh: v.optional(v.pipe(v.string(), v.transform((s) => s === 'true')), 'false'),
});
export type GetStatisticsInsightsQuery = v.InferOutput<typeof getStatisticsInsightsQuerySchema>;

// What the LLM must return. Validated post-parse; failures fall back silently.
export const aiInsightToneSchema = v.picklist(['neutral', 'positive', 'negative']);

export const aiInsightBulletSchema = v.object({
    title: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
    detail: v.pipe(v.string(), v.minLength(1), v.maxLength(280)),
    tone: aiInsightToneSchema,
});

export const aiInsightOutputSchema = v.object({
    headline: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
    bullets: v.pipe(
        v.array(aiInsightBulletSchema),
        v.minLength(1, 'AI returned no bullets'),
        v.maxLength(8),
    ),
});
export type AiInsightOutput = v.InferOutput<typeof aiInsightOutputSchema>;

export interface StatisticsInsightsResponse {
    headline: string;
    bullets: Array<{ title: string; detail: string; tone: 'neutral' | 'positive' | 'negative' }>;
    generatedAt: string;
    cached: boolean;
}
