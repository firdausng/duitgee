import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { attachments } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { parse, safeParse } from 'valibot';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import { categoryData } from '$lib/configurations/categories';
import {
    aiOutputSchema,
    type ScanAttachmentRequest,
    type ScanAttachmentResponse,
} from '$lib/schemas/scanAttachment';

const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

// Per-user daily scan cap and per-attachment dedupe window. Both keyed in KV.
const DAILY_SCAN_LIMIT = 50;
const DEDUPE_TTL_SECONDS = 60 * 60 * 24; // 24 hours

const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Build the prompt fed to the vision model. Inlines the Lean Core category
 * names so the model picks one of ours. Strict JSON-only contract — anything
 * else is treated as a malformed response.
 */
function buildPrompt(): string {
    const categoryNames = categoryData.categories.map((c) => c.name);
    return `You are extracting structured data from a receipt or invoice image.

Return ONLY valid JSON matching this schema. No prose, no markdown fences:
{
  "amount": number | null,
  "currency": string | null,
  "merchant": string | null,
  "date": string | null,
  "time": string | null,
  "category": string,
  "confidence": "high" | "medium" | "low"
}

Field guidance:
- amount: total paid (number, no currency symbol). null if unreadable.
- currency: ISO 4217 code if visible (e.g. "MYR", "USD"). null otherwise.
- merchant: vendor / store / restaurant name as printed. null only if completely missing.
- date: ISO date YYYY-MM-DD if visible. null otherwise.
- time: HH:MM (24-hour) if visible. null otherwise.
- category: pick the closest match from this list, exact spelling:
${categoryNames.map((n) => `  - ${n}`).join('\n')}
  If nothing fits, use "Misc".
- confidence: your overall self-rating of how likely the extraction is correct.`;
}

/**
 * Map whatever the AI returned in the `category` field to a canonical Lean Core
 * category name. Case-insensitive exact match; otherwise fall back to "Misc".
 */
function normalizeCategory(raw: string): string {
    const target = raw.trim().toLowerCase();
    const match = categoryData.categories.find(
        (c) => c.name.toLowerCase() === target,
    );
    return match?.name ?? 'Misc';
}

/**
 * Combine date + time into a `YYYY-MM-DDTHH:mm` string for datetime-local inputs.
 * Returns null if no date.
 */
function combineDateTime(date: string | null, time: string | null): string | null {
    if (!date) return null;
    // Accept loose date formats; require YYYY-MM-DD shape after a parse.
    const dateMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date.trim());
    if (!dateMatch) return null;
    const [, y, m, d] = dateMatch;
    const dd = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (!time) return `${dd}T00:00`;
    const timeMatch = /^(\d{1,2}):(\d{2})/.exec(time.trim());
    if (!timeMatch) return `${dd}T00:00`;
    const [, h, mn] = timeMatch;
    return `${dd}T${h.padStart(2, '0')}:${mn}`;
}

const todayKey = (): string => {
    // YYYYMMDD in UTC — date boundaries don't need to match the user's tz here;
    // the cap is just a coarse abuse guardrail.
    const d = new Date();
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
};

export const scanAttachment = async (
    session: App.AuthSession,
    data: ScanAttachmentRequest,
    env: Cloudflare.Env,
): Promise<ScanAttachmentResponse> => {
    const userId = session.user.id;

    // 1. Permission + entitlement gates (cheap, fail-fast).
    await requireVaultPermission(session, data.vaultId, 'canCreateExpenses', env);
    await requireVaultEntitlement(session, data.vaultId, 'attachment:scan', env);

    // 2. Per-attachment dedupe — same attachment scanned in the last 24h returns the cached result.
    const dedupeKey = `scan-result:${data.attachmentId}`;
    const cached = await env.KV.get(dedupeKey);
    if (cached) {
        try {
            return JSON.parse(cached) as ScanAttachmentResponse;
        } catch {
            // Cache is corrupt; fall through and re-scan.
        }
    }

    // 3. Per-user daily cap.
    const counterKey = `scan-count:${userId}:${todayKey()}`;
    const countStr = await env.KV.get(counterKey);
    const count = countStr ? Number(countStr) : 0;
    if (count >= DAILY_SCAN_LIMIT) {
        throw new Error(
            `Daily scan limit reached (${DAILY_SCAN_LIMIT}/day). Try again tomorrow.`,
        );
    }

    // 4. Verify attachment belongs to this vault and is a supported image.
    const client = drizzle(env.DB, { schema });
    const [row] = await client
        .select()
        .from(attachments)
        .where(and(
            eq(attachments.id, data.attachmentId),
            eq(attachments.vaultId, data.vaultId),
            isNull(attachments.deletedAt),
        ))
        .limit(1);

    if (!row) throw new Error('Attachment not found');
    if (!SUPPORTED_MIME_TYPES.has(row.mimeType)) {
        throw new Error('Scan supports JPEG, PNG, or WebP images only');
    }

    // 5. Pull the file bytes from R2.
    const obj = await env.ATTACHMENTS_BUCKET.get(row.r2Key);
    if (!obj) throw new Error('Attachment file is missing from storage');
    const bytes = new Uint8Array(await obj.arrayBuffer());

    // 6. Call the vision model.
    //
    // Llama-3.2-11b-vision-instruct requires a one-time per-account license
    // acceptance. Cloudflare returns error code 5016 the first time the model
    // is called, with instructions to submit `prompt: 'agree'` to accept the
    // Meta Community License. We handle that transparently: on 5016, send the
    // `agree` prompt, then retry the original call once.
    //
    // Important: by deploying this handler you are accepting the Meta Llama
    // Community License (https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE)
    // and Acceptable Use Policy. Cloudflare requires the deployer to also
    // confirm that they are NOT domiciled in, nor have a principal place of
    // business in, the European Union. Only ship this code if that holds.
    const callAi = () =>
        env.AI.run(MODEL, {
            prompt: buildPrompt(),
            image: Array.from(bytes),
            max_tokens: 512,
        } as never);

    let aiRaw: unknown;
    try {
        aiRaw = await callAi();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isLicenseError = message.includes('5016') || /submit the prompt 'agree'/i.test(message);

        if (isLicenseError) {
            console.warn('Llama vision model requires license acceptance — submitting agree and retrying.');
            try {
                await env.AI.run(MODEL, { prompt: 'agree' } as never);
            } catch (acceptErr) {
                console.error('Failed to accept Llama license:', acceptErr);
                throw new Error(
                    'Scan unavailable: this Cloudflare account has not accepted the Llama vision model license yet, and auto-accept failed.',
                );
            }
            // Retry the actual scan after license acceptance.
            try {
                aiRaw = await callAi();
            } catch (retryErr) {
                const cause = retryErr instanceof Error ? retryErr.message : String(retryErr);
                console.error('AI scan failed after license accept:', retryErr);
                throw new Error(`Scan failed: ${cause}`);
            }
        } else {
            // Surface other errors so we can see what's actually wrong (model not
            // found, image too large, rate limited, etc.)
            console.error('AI scan failed:', err);
            throw new Error(`Scan failed: ${message}`);
        }
    }

    // 7. The model returns { response: "...JSON..." }. Parse defensively.
    const responseText: string = (() => {
        if (aiRaw && typeof aiRaw === 'object' && 'response' in aiRaw) {
            const v = (aiRaw as { response: unknown }).response;
            if (typeof v === 'string') return v;
        }
        return '';
    })();

    if (!responseText) throw new Error('Empty response from scanner');

    // The model sometimes wraps JSON in fences or trailing prose. Extract the
    // first {...} block and try to parse just that.
    const jsonMatch = /\{[\s\S]*\}/.exec(responseText);
    if (!jsonMatch) throw new Error('Scanner did not return JSON');

    let parsedJson: unknown;
    try {
        parsedJson = JSON.parse(jsonMatch[0]);
    } catch {
        throw new Error('Scanner returned malformed JSON');
    }

    const validation = safeParse(aiOutputSchema, parsedJson);
    if (!validation.success) {
        console.error('AI output validation failed:', validation.issues, parsedJson);
        throw new Error('Scanner returned an unexpected shape');
    }
    const ai = validation.output;

    // 8. Sanity-bound the amount; nonsense values become null rather than poisoning the form.
    const safeAmount = ai.amount !== null && ai.amount > 0 && ai.amount <= 1_000_000
        ? ai.amount
        : null;

    const result: ScanAttachmentResponse = {
        amount: safeAmount,
        currency: ai.currency,
        merchant: ai.merchant,
        datetime: combineDateTime(ai.date, ai.time),
        suggestedCategory: normalizeCategory(ai.category),
        confidence: ai.confidence,
    };

    // 9. Cache result for dedupe + bump the daily counter. Both writes are
    // best-effort — failure here doesn't roll back the scan.
    try {
        await env.KV.put(dedupeKey, JSON.stringify(result), {
            expirationTtl: DEDUPE_TTL_SECONDS,
        });
        await env.KV.put(counterKey, String(count + 1), {
            // Counter expires at end of next day — covers UTC slop without complex midnight math.
            expirationTtl: DEDUPE_TTL_SECONDS * 2,
        });
    } catch (err) {
        console.warn('Failed to write scan KV bookkeeping:', err);
    }

    return result;
};
