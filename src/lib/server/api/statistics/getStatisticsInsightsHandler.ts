import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { statisticsInsights, vaults, expenses } from '$lib/server/db/schema';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { safeParse } from 'valibot';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import { getStatisticsDashboard } from './getStatisticsDashboardHandler';
import { getMonthlyHistory } from './getMonthlyHistory';
import { detectAnomalies } from './detectAnomalies';
import {
    summarizeDashboardForLlm,
    filterUngroundedBullets,
    computeInsightCacheKey,
    type LlmDashboardSummary,
} from './insightSummary';
import {
    aiInsightOutputSchema,
    INSIGHTS_MONTHLY_LIMIT,
    type StatisticsInsightsResponse,
} from '$lib/schemas/statisticsInsights';
import { defaultRange } from './helpers';

// 70b fp8-fast for fluent prose; 8b fallback if the binding errors.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MODEL_FALLBACK = '@cf/meta/llama-3.1-8b-instruct';

// Cache TTL in seconds. 6 hours for ranges that include today (data still
// mutating), 30 days for fully-past ranges.
const TTL_LIVE_SECONDS = 6 * 60 * 60;
const TTL_PAST_SECONDS = 30 * 24 * 60 * 60;

const monthKey = (): string => {
    const d = new Date();
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const buildPrompt = (summary: LlmDashboardSummary): string => {
    return `You are a financial dashboard assistant. The user is reviewing their spending for ${summary.period.label} (${summary.currency}). They can already see the dashboard's charts and numbers — your job is to add insight the charts don't already show.

DATA:
${JSON.stringify(summary, null, 2)}

# CORE PRINCIPLE
The user is staring at a dashboard with a hero number, category donut, member list, fund cards, and a trend chart. **If a bullet only restates what one of those charts shows, it is worthless.** Every bullet must do at least one of:
  (a) Connect ACROSS sections — "groceries fell while dining rose; eating out replaced cooking"
  (b) Reach BACK in history — "highest Internet bill in 6 months", "third straight month of declining groceries"
  (c) Surface an ANOMALY — "one ${summary.currency} 540 transaction is 4.2x your typical Dining"
  (d) Reveal a CONCENTRATION the user might miss — "85% on credit card" is fine ONLY if paired with a "why it matters" angle
  (e) Highlight an ABSENCE — "no transport spend this month, unusual"

# BAD BULLETS (do NOT write these — they just retype the dashboard)
- "Spending was MYR 706 this period" ← already in the hero card
- "Groceries fell to MYR 94" ← already in the category list
- "Internet took 71% of spend" ← already in the donut
- "Down 87% from previous period" ← already in the hero delta
- "Credit card was 85% of spend" ← already in the payment-type donut

# GOOD BULLETS (do write these — they synthesize)
- "Internet dominated like never before" — "MYR 500 on Internet & Phone is the highest in 6 months and 71% of total — a one-time bill or new subscription?"
- "Substitution effect" — "Groceries dropped 80% while dining stayed flat — possibly fewer home-cooked meals"
- "Credit-heavy month" — "85% on credit despite cash being typical — check the statement carefully"
- "Single transaction drove the category" — "One MYR 540 charge made up most of Dining; without it the category looks normal"
- "Three months of decline" — "Groceries down for 3 straight months — intentional, or stockpile running out?"

# RULES
- Only cite figures that appear in the data. Never invent numbers.
- If a comparison number is null, say "no comparable previous period" — don't fabricate a trend.
- Use \`monthlyHistory\` and \`categoryHistory\` aggressively. The current period is the LAST entry. Each \`categoryHistory[].monthly\` is aligned 1:1 with \`monthlyHistory[].month\`.
- \`anomalies\` lists transactions flagged as outliers vs the user's 90-day baseline. If non-empty, surface at least one — use the \`multiple\` field ("4.2x typical"). Don't speculate about the cause.
- \`topFunds\` and \`topTemplates\` are most useful when one of them dominates or spikes vs others.
- \`unidentifiedReminder\` is set when there are unidentified expenses pending review. Mention it AT MOST ONCE if material (e.g. count >= 3 or totalAmount is meaningful) — wording like "3 charges totalling ${summary.currency} 320 are still unidentified — claim them to fill in the picture." Skip entirely if null or trivial.
- Currency: ${summary.currency}. Format amounts like "${summary.currency} 240" — no decimals unless under 10.
- Each bullet: a short title (under 8 words) and a detail sentence (under 25 words).
- Tone: "negative" for unfavorable shifts, "positive" for favorable, "neutral" for descriptive.
- Prefer 3-4 strong bullets over 5 weak ones. If you can't find 5 insight-grade observations, return fewer.
- Do not give advice. Describe and connect; don't prescribe.

Return ONLY this JSON, no markdown fences, no prose:
{
  "headline": "string (one insight sentence — NOT 'spending was X, down Y%'; instead 'A quiet month with one outsized Internet bill')",
  "bullets": [
    { "title": "string", "detail": "string", "tone": "negative" | "positive" | "neutral" }
  ]
}`;
};

interface AiCallResult {
    payload: { headline: string; bullets: Array<{ title: string; detail: string; tone: 'neutral' | 'positive' | 'negative' }> };
    model: string;
}

/**
 * Scan for the first balanced `{...}` JSON object, ignoring braces inside
 * strings. Necessary because models sometimes emit multiple blocks (a plain
 * one and a markdown-fenced duplicate); a greedy regex would grab both plus
 * the fence text between them, which won't parse.
 */
const extractFirstJsonObject = (text: string): string | null => {
    let depth = 0;
    let inString = false;
    let escape = false;
    let start = -1;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (inString) {
            if (ch === '\\') escape = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') {
            inString = true;
            continue;
        }
        if (ch === '{') {
            if (depth === 0) start = i;
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
                return text.slice(start, i + 1);
            }
        }
    }
    return null;
};

/**
 * Pull the text content out of whatever shape Workers AI returned.
 * Different models return slightly different envelopes; cover the common cases.
 */
const extractResponseText = (raw: unknown): string => {
    if (!raw || typeof raw !== 'object') return '';
    const r = raw as Record<string, unknown>;

    // 1. Standard `{ response: "..." }` shape (most text-generation models).
    if (typeof r.response === 'string' && r.response.length > 0) return r.response;

    // 2. Some models wrap in `result`.
    if (typeof r.result === 'string' && r.result.length > 0) return r.result;

    // 3. OpenAI-compatible `{ choices: [{ message: { content } }] }`.
    if (Array.isArray(r.choices) && r.choices.length > 0) {
        const first = r.choices[0] as { message?: { content?: unknown }; text?: unknown };
        if (typeof first?.message?.content === 'string' && first.message.content.length > 0) {
            return first.message.content;
        }
        if (typeof first?.text === 'string' && first.text.length > 0) return first.text;
    }

    return '';
};

const callAi = async (
    env: Cloudflare.Env,
    summary: LlmDashboardSummary,
): Promise<AiCallResult> => {
    const prompt = buildPrompt(summary);

    const tryModel = async (model: string): Promise<unknown> => {
        return await env.AI.run(model as never, {
            prompt,
            max_tokens: 768,
        } as never);
    };

    // Try primary, fall back on either throw OR empty content.
    let raw: unknown;
    let usedModel = MODEL;
    let responseText = '';
    try {
        raw = await tryModel(MODEL);
        responseText = extractResponseText(raw);
    } catch (err) {
        console.warn('Primary insights model threw, falling back:', err);
    }

    if (!responseText) {
        if (raw !== undefined) {
            console.warn(
                'Primary insights model returned empty/unknown shape, falling back. Raw:',
                JSON.stringify(raw)?.slice(0, 500),
            );
        }
        try {
            usedModel = MODEL_FALLBACK;
            raw = await tryModel(MODEL_FALLBACK);
            responseText = extractResponseText(raw);
        } catch (err) {
            console.error('Fallback insights model threw:', err);
            throw new Error('Insights model unavailable');
        }
    }

    if (!responseText) {
        console.error(
            'Both insights models returned empty/unknown shape. Raw:',
            JSON.stringify(raw)?.slice(0, 500),
        );
        throw new Error('Empty response from insights model');
    }

    const jsonText = extractFirstJsonObject(responseText);
    if (!jsonText) {
        console.error('Insights response missing JSON. Response:', responseText.slice(0, 500));
        throw new Error('Insights model did not return JSON');
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonText);
    } catch (err) {
        console.error(
            'Insights JSON parse failed:',
            err instanceof Error ? err.message : err,
            'Body:',
            jsonText.slice(0, 800),
        );
        throw new Error('Insights model returned malformed JSON');
    }

    const validation = safeParse(aiInsightOutputSchema, parsed);
    if (!validation.success) {
        console.error('Insights output validation failed:', validation.issues, parsed);
        throw new Error('Insights model returned an unexpected shape');
    }

    return { payload: validation.output, model: usedModel };
};

/**
 * Fetch (or generate) cached AI insights for a vault and period.
 *
 * - Cache lives in `statistics_insights` keyed on sha256(vaultId|start|end).
 * - Per-vault monthly counter in KV caps generations.
 * - Failures are caller's job to silence — this throws on real problems so
 *   the route can return structured errors.
 */
export const getStatisticsInsights = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: { start?: string; end?: string; refresh?: boolean },
): Promise<StatisticsInsightsResponse> => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');
    await requireVaultEntitlement(session, vaultId, 'stats:ai_insights', env);

    const range = defaultRange();
    const start = query.start ?? range.start;
    const end = query.end ?? range.end;

    const cacheKey = await computeInsightCacheKey(vaultId, start, end);

    const client = drizzle(env.DB, { schema });

    // 1. Cache lookup
    if (!query.refresh) {
        const [hit] = await client
            .select()
            .from(statisticsInsights)
            .where(eq(statisticsInsights.cacheKey, cacheKey))
            .limit(1);

        if (hit) {
            const includesToday = end.slice(0, 10) >= new Date().toISOString().slice(0, 10);
            const ttl = includesToday ? TTL_LIVE_SECONDS : TTL_PAST_SECONDS;
            const generatedAtMs = new Date(hit.generatedAt).getTime();
            const fresh = Date.now() - generatedAtMs < ttl * 1000;
            if (fresh) {
                try {
                    const payload = JSON.parse(hit.payload) as StatisticsInsightsResponse['bullets'] extends infer B
                        ? { headline: string; bullets: B }
                        : never;
                    return {
                        headline: payload.headline,
                        bullets: payload.bullets,
                        generatedAt: hit.generatedAt,
                        cached: true,
                    };
                } catch {
                    // Corrupt cache — fall through to regenerate.
                }
            }
        }
    }

    // 2. Per-vault monthly rate-limit
    const counterKey = `insights-count:${vaultId}:${monthKey()}`;
    const countStr = await env.KV.get(counterKey);
    const count = countStr ? Number(countStr) : 0;
    if (count >= INSIGHTS_MONTHLY_LIMIT) {
        throw new Error(
            `Monthly insight limit reached (${INSIGHTS_MONTHLY_LIMIT}/month). Resets on the 1st.`,
        );
    }

    // 3. Pull dashboard payload, 6-month history, anomalies, vault meta, and
    //    unidentified count — all in parallel.
    const [dashboard, history, anomalies, vaultRows, unidentifiedRows] = await Promise.all([
        getStatisticsDashboard(vaultId, session, env, {
            vaultId,
            start,
            end,
            compare: 'prev',
            includeNetPosition: true,
            topN: 5,
        }),
        getMonthlyHistory(vaultId, env, 5, new Date(end)).catch((err) => {
            // History is enrichment, not core — failure here just means the LLM
            // gets a single-period view. Log and proceed.
            console.warn('Monthly history fetch failed:', err);
            return undefined;
        }),
        detectAnomalies(vaultId, env, start, end, 5).catch((err) => {
            console.warn('Anomaly detection failed:', err);
            return [];
        }),
        client
            .select({ currency: vaults.currency })
            .from(vaults)
            .where(eq(vaults.id, vaultId))
            .limit(1),
        client
            .select({
                count: sql<number>`COUNT(*)`,
                totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            })
            .from(expenses)
            .where(
                and(
                    eq(expenses.vaultId, vaultId),
                    eq(expenses.status, 'unidentified'),
                    isNull(expenses.deletedAt),
                ),
            ),
    ]);
    const currency = vaultRows[0]?.currency ?? 'USD';
    const unidentified = unidentifiedRows[0]
        ? { count: unidentifiedRows[0].count, totalAmount: unidentifiedRows[0].totalAmount }
        : { count: 0, totalAmount: 0 };

    const summary = summarizeDashboardForLlm(
        dashboard,
        { start, end },
        currency,
        history,
        anomalies,
        unidentified,
    );

    // 4. Call AI, validate, ground.
    const ai = await callAi(env, summary);
    const grounded = filterUngroundedBullets(ai.payload, summary);

    if (grounded.bullets.length === 0) {
        // All bullets cited ungrounded numbers — treat as failure.
        throw new Error('Insights produced no grounded bullets');
    }

    // 5. Persist
    const promptTokenEstimate = Math.ceil(JSON.stringify(summary).length / 4);
    const outputTokenEstimate = Math.ceil(
        (grounded.headline.length + grounded.bullets.reduce((s, b) => s + b.title.length + b.detail.length, 0)) / 4,
    );

    const generatedAt = new Date().toISOString();
    const persistPayload = JSON.stringify({
        headline: grounded.headline,
        bullets: grounded.bullets,
    });

    try {
        await client
            .insert(statisticsInsights)
            .values({
                vaultId,
                periodStart: start.slice(0, 10),
                periodEnd: end.slice(0, 10),
                cacheKey,
                payload: persistPayload,
                inputTokenCount: promptTokenEstimate,
                outputTokenCount: outputTokenEstimate,
                model: ai.model,
                generatedAt,
                generatedBy: session.user.id,
            })
            .onConflictDoUpdate({
                target: statisticsInsights.cacheKey,
                set: {
                    payload: persistPayload,
                    inputTokenCount: promptTokenEstimate,
                    outputTokenCount: outputTokenEstimate,
                    model: ai.model,
                    generatedAt,
                    generatedBy: session.user.id,
                },
            });
    } catch (err) {
        console.warn('Failed to persist insights row:', err);
    }

    // 6. Bump monthly counter (best-effort)
    try {
        await env.KV.put(counterKey, String(count + 1), {
            // ~33 days — covers calendar slop without midnight math.
            expirationTtl: 33 * 24 * 60 * 60,
        });
    } catch (err) {
        console.warn('Failed to bump insights counter:', err);
    }

    return {
        headline: grounded.headline,
        bullets: grounded.bullets,
        generatedAt,
        cached: false,
    };
};

/**
 * Cron-time cleanup: delete insight rows older than 60 days. Called from the
 * existing daily cron handler.
 */
export const purgeOldInsights = async (env: Cloudflare.Env): Promise<{ deleted: number }> => {
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const client = drizzle(env.DB, { schema });
    const result = await client
        .delete(statisticsInsights)
        .where(lt(statisticsInsights.generatedAt, cutoff))
        .returning({ id: statisticsInsights.id });
    return { deleted: result.length };
};
