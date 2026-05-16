import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringIncome, incomeTemplates } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { parseISO, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { initialAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import {
    computeNextOccurrence,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import { processDueRecurringIncome } from './processDueRecurringIncome';
import type { CreateRecurringIncomeRequest } from '$lib/schemas/recurringIncome';

export const createRecurringIncome = async (
    session: App.AuthSession,
    data: CreateRecurringIncomeRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    // Template must exist + be active in this vault.
    const [template] = await client
        .select({ id: incomeTemplates.id })
        .from(incomeTemplates)
        .where(
            and(
                eq(incomeTemplates.id, data.templateId),
                eq(incomeTemplates.vaultId, data.vaultId),
                isNull(incomeTemplates.deletedAt),
            ),
        )
        .limit(1);
    if (!template) throw new Error('Income template not found in this vault');

    // Auto mode is Pro-only. Queue mode is free.
    if (data.generationMode === 'auto') {
        await requireVaultEntitlement(session, data.vaultId, 'income:auto_generation', env);
    }

    const anchor = parseISO(data.anchorDate);
    const now = new UTCDate();
    const anchorIsPast = anchor.getTime() <= now.getTime();
    const shouldBackfill = data.backfill === true && anchorIsPast;

    // Three starting-point cases:
    //   - backfill + past anchor → start AT anchor; engine catches up to now
    //   - past anchor, no backfill → skip ahead to next future occurrence
    //   - future anchor → start AT anchor
    let nextOccurrence: Date;
    if (shouldBackfill) {
        nextOccurrence = anchor;
    } else if (anchorIsPast) {
        nextOccurrence = computeNextOccurrence(
            anchor,
            data.scheduleUnit as ScheduleUnit,
            data.scheduleInterval,
            now,
        );
    } else {
        nextOccurrence = anchor;
    }

    const [rule] = await client
        .insert(recurringIncome)
        .values({
            vaultId: data.vaultId,
            templateId: data.templateId,
            name: data.name ?? null,
            amountOverride: data.amountOverride ?? null,
            scheduleUnit: data.scheduleUnit,
            scheduleInterval: data.scheduleInterval,
            anchorDate: data.anchorDate,
            generationMode: data.generationMode,
            status: 'active',
            endDate: data.endDate ?? null,
            nextOccurrenceAt: formatISO(new UTCDate(nextOccurrence)),
            occurrenceCount: 0,
            ...initialAuditFields({ userId }),
        })
        .returning();

    // Materialize back-fill synchronously via the engine. Same code path as
    // the cron / lazy catch-up, so fund integration + breakdown materialization
    // are uniformly handled. Engine's MAX_CATCHUP_PER_RULE (50) caps the run.
    let backfilled = 0;
    if (shouldBackfill) {
        try {
            const result = await processDueRecurringIncome(env, { ruleId: rule.id });
            backfilled = result.autoCreated + result.queued;
        } catch (err) {
            // Don't fail the create on a back-fill error — the rule exists,
            // future occurrences will fire normally, and the user can retry
            // back-fill semantics by lazy-read (engine runs on list fetch).
            console.error('[createRecurringIncome] back-fill failed', { ruleId: rule.id, err });
        }
    }

    return { ...rule, backfilled };
};
