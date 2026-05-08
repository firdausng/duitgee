import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { attachments } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { safeParse } from 'valibot';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import { categoryData } from '$lib/configurations/categories';
import {
    aiMultiOutputSchema,
    type ScanAttachmentMultiRequest,
    type ScanAttachmentMultiResponse,
    type ScanAttachmentMultiItem,
} from '$lib/schemas/scanAttachment';

const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct';

const DAILY_SCAN_LIMIT = 50;
const DEDUPE_TTL_SECONDS = 60 * 60 * 24;
const MAX_ITEMS = 20;

const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPPORTED_PDF_MIME_TYPES = new Set(['application/pdf']);

function buildMultiTextPrompt(markdown: string): string {
    const categoryNames = categoryData.categories.map((c) => c.name);
    return `You are extracting MULTIPLE expense entries from a single screenshot, receipt, or document. Below is the markdown content:

---
${markdown}
---

The input may be:
- An itemized receipt (one merchant, many line items — return each as a separate entry)
- Multiple bank/wallet notifications stacked in one screenshot (each is its own entry)
- A group expense list or split-bill summary (each line is its own entry)
- A single transaction (return one entry)

Return ONLY valid JSON matching this schema. No prose, no markdown fences:
{
  "sourceMerchant": string | null,
  "sourceDate": string | null,
  "sourceTime": string | null,
  "items": [
    {
      "amount": number | null,
      "currency": string | null,
      "note": string | null,
      "date": string | null,
      "time": string | null,
      "category": string,
      "confidence": "high" | "medium" | "low"
    }
  ]
}

Field guidance:
- sourceMerchant: when ALL items share one merchant (e.g. itemized restaurant bill), set it. null if items have different merchants.
- sourceDate: ISO YYYY-MM-DD if a single date applies to all items. null otherwise.
- sourceTime: HH:MM (24-hour) if visible at the document level.
- items[].amount: line-item total (number, no symbol). null if unreadable.
- items[].currency: ISO 4217 if visible per item; null otherwise.
- items[].note: short description of the item or transaction (e.g. "Latte", "Grab ride", "Apple iPhone case"). null if no useful description.
- items[].date / items[].time: only set if this item has a date/time DIFFERENT from sourceDate/sourceTime. null otherwise.
- items[].category: pick the closest match from this list, exact spelling:
${categoryNames.map((n) => `  - ${n}`).join('\n')}
  If nothing fits, use "Misc".
- items[].confidence: self-rating per item.

Hard rules:
- Return at most ${MAX_ITEMS} items. If the document has more, return the most prominent ${MAX_ITEMS}.
- Do NOT invent items. If only one transaction is visible, return one item.
- Skip subtotal/tax/total summary lines on receipts — only return actual purchasable items unless the document is a pure transaction list.`;
}

function normalizeCategory(raw: string): string {
    const target = raw.trim().toLowerCase();
    const match = categoryData.categories.find(
        (c) => c.name.toLowerCase() === target,
    );
    return match?.name ?? 'Misc';
}

function combineDateTime(date: string | null, time: string | null): string | null {
    if (!date) return null;
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
    const d = new Date();
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
};

export const scanAttachmentMulti = async (
    session: App.AuthSession,
    data: ScanAttachmentMultiRequest,
    env: Cloudflare.Env,
): Promise<ScanAttachmentMultiResponse> => {
    const userId = session.user.id;

    // 1. Permission + entitlement gates.
    await requireVaultPermission(session, data.vaultId, 'canCreateExpenses', env);
    await requireVaultEntitlement(session, data.vaultId, 'attachment:scan', env);

    // 2. Per-attachment dedupe — multi-mode keyed separately so it doesn't collide
    //    with a prior single-mode scan of the same image.
    const dedupeKey = `scan-result-multi:${data.attachmentId}`;
    const cached = await env.KV.get(dedupeKey);
    if (cached) {
        try {
            return JSON.parse(cached) as ScanAttachmentMultiResponse;
        } catch {
            // corrupt — fall through and re-scan.
        }
    }

    // 3. Per-user daily cap (shared with single-scan; one LLM call either way).
    const counterKey = `scan-count:${userId}:${todayKey()}`;
    const countStr = await env.KV.get(counterKey);
    const count = countStr ? Number(countStr) : 0;
    if (count >= DAILY_SCAN_LIMIT) {
        throw new Error(
            `Daily scan limit reached (${DAILY_SCAN_LIMIT}/day). Try again tomorrow.`,
        );
    }

    // 4. Verify attachment.
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
    const isImage = SUPPORTED_IMAGE_MIME_TYPES.has(row.mimeType);
    const isPdf = SUPPORTED_PDF_MIME_TYPES.has(row.mimeType);
    if (!isImage && !isPdf) {
        throw new Error('Scan supports JPEG, PNG, WebP images, or PDF documents');
    }

    // 5. Pull the file bytes from R2.
    const obj = await env.ATTACHMENTS_BUCKET.get(row.r2Key);
    if (!obj) throw new Error('Attachment file is missing from storage');
    const bytes = new Uint8Array(await obj.arrayBuffer());

    // 6. toMarkdown → multi-mode LLM prompt.
    const warnings: string[] = [];
    let aiRaw: unknown;
    {
        let markdown: string;
        try {
            const raw = await env.AI.toMarkdown({
                name: row.fileName,
                blob: new Blob([bytes as unknown as ArrayBuffer], { type: row.mimeType }),
            } as never);
            const conversion = (Array.isArray(raw) ? raw[0] : raw) as {
                format: 'markdown' | 'error';
                data?: string;
                error?: string;
            };
            if (!conversion || conversion.format === 'error' || !conversion.data) {
                throw new Error(conversion?.error || 'Conversion returned no text');
            }
            markdown = conversion.data;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('toMarkdown conversion failed (multi):', err);
            throw new Error(`Could not read ${isPdf ? 'PDF' : 'image'}: ${message}`);
        }

        if (!markdown.trim()) {
            throw new Error(
                isPdf
                    ? 'PDF has no extractable text — try a screenshot of the receipt instead'
                    : 'Could not read text from image',
            );
        }

        try {
            aiRaw = await env.AI.run(TEXT_MODEL as never, {
                prompt: buildMultiTextPrompt(markdown),
                // Higher cap than single-scan: the multi-item array is wordier.
                max_tokens: 2048,
            } as never);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('Multi-scan failed:', err);
            throw new Error(`Scan failed: ${message}`);
        }
    }

    // 7. Parse the model's response defensively.
    const responseText: string = (() => {
        if (aiRaw && typeof aiRaw === 'object' && 'response' in aiRaw) {
            const v = (aiRaw as { response: unknown }).response;
            if (typeof v === 'string') return v;
        }
        return '';
    })();

    if (!responseText) throw new Error('Empty response from scanner');

    const jsonMatch = /\{[\s\S]*\}/.exec(responseText);
    if (!jsonMatch) {
        // Soft fail — return an empty result with a warning so the UI can show
        // a friendly "we couldn't read it" state instead of erroring out.
        return { items: [], sourceMerchant: null, sourceDate: null, warnings: ['parse_failed'] };
    }

    let parsedJson: unknown;
    try {
        parsedJson = JSON.parse(jsonMatch[0]);
    } catch {
        return { items: [], sourceMerchant: null, sourceDate: null, warnings: ['parse_failed'] };
    }

    const validation = safeParse(aiMultiOutputSchema, parsedJson);
    if (!validation.success) {
        console.error('AI multi output validation failed:', validation.issues, parsedJson);
        return { items: [], sourceMerchant: null, sourceDate: null, warnings: ['parse_failed'] };
    }
    const ai = validation.output;

    // 8. Normalize items: clamp count, sanity-bound amounts, combine date/time
    //    (per-item date overrides screenshot-level date).
    const trimmedItems = ai.items.slice(0, MAX_ITEMS);
    if (ai.items.length > MAX_ITEMS) warnings.push('truncated_to_20');

    const normalized: ScanAttachmentMultiItem[] = trimmedItems.map((it) => {
        const safeAmount =
            it.amount !== null && it.amount > 0 && it.amount <= 1_000_000 ? it.amount : null;
        const itemDate = it.date ?? ai.sourceDate;
        const itemTime = it.time ?? ai.sourceTime;
        return {
            amount: safeAmount,
            currency: it.currency ?? null,
            note: it.note ?? null,
            datetime: combineDateTime(itemDate, itemTime),
            suggestedCategory: normalizeCategory(it.category),
            confidence: it.confidence,
        };
    });

    // Currency-mismatch flag: any two non-null currencies disagree.
    const seenCurrencies = new Set<string>();
    for (const it of normalized) {
        if (it.currency) seenCurrencies.add(it.currency.toUpperCase());
    }
    if (seenCurrencies.size > 1) warnings.push('currency_mismatch');

    const result: ScanAttachmentMultiResponse = {
        items: normalized,
        sourceMerchant: ai.sourceMerchant ?? null,
        sourceDate: combineDateTime(ai.sourceDate, ai.sourceTime),
        warnings,
    };

    // 9. Best-effort cache + counter bump.
    try {
        await env.KV.put(dedupeKey, JSON.stringify(result), {
            expirationTtl: DEDUPE_TTL_SECONDS,
        });
        await env.KV.put(counterKey, String(count + 1), {
            expirationTtl: DEDUPE_TTL_SECONDS * 2,
        });
    } catch (err) {
        console.warn('Failed to write multi-scan KV bookkeeping:', err);
    }

    return result;
};
