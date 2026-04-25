import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringExpenses, expenseTemplates } from '$lib/server/db/schema';
import { and, eq, isNull, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { parseISO, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { initialAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement, checkVaultEntitlement } from '$lib/server/utils/entitlements';
import {
    computeNextOccurrence,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import { processDueRecurringExpenses } from './processDueRecurringExpenses';
import { type CreateRecurringExpenseWithTemplateRequest, RECURRING_MAX_PER_VAULT_FREE } from '$lib/schemas/recurringExpenses';

/**
 * Create a recurring rule and its backing template in a single atomic D1 batch.
 * This is the primary entry point for the /recurring/new UI — users never need
 * to create a template separately.
 *
 * Back-fill (data.backfill === true with a past anchor) is handled by setting
 * nextOccurrenceAt to the anchor itself, then invoking the engine once post-commit.
 * The engine creates real expenses for auto mode or pending items for queue mode —
 * identical logic to normal catch-up firing.
 */
export const createRecurringExpenseWithTemplate = async (
    session: App.AuthSession,
    data: CreateRecurringExpenseWithTemplateRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageRecurring', env);
    await requireVaultEntitlement(session, data.vaultId, 'recurring:create', env);

    if (data.scheduleInterval > 1) {
        await requireVaultEntitlement(session, data.vaultId, 'recurring:custom_interval', env);
    }
    if (data.generationMode === 'auto') {
        await requireVaultEntitlement(session, data.vaultId, 'recurring:auto_generation', env);
    }

    // Gate: more than one active rule requires Pro
    const [activeCount] = await client
        .select({ n: count() })
        .from(recurringExpenses)
        .where(
            and(
                eq(recurringExpenses.vaultId, data.vaultId),
                eq(recurringExpenses.status, 'active'),
                isNull(recurringExpenses.deletedAt),
            ),
        );
    if ((activeCount?.n ?? 0) >= RECURRING_MAX_PER_VAULT_FREE) {
        const canMultiple = await checkVaultEntitlement(
            data.vaultId,
            'recurring:create_multiple',
            env,
        );
        if (!canMultiple) {
            throw new Error(
                `Free plan allows up to ${RECURRING_MAX_PER_VAULT_FREE} active recurring rules per vault. Upgrade to Pro to add more.`,
            );
        }
    }

    const templateId = createId();
    const ruleId = createId();

    const anchor = parseISO(data.anchorDate);
    const now = new UTCDate();
    const shouldBackfill = data.backfill === true && anchor.getTime() <= now.getTime();

    // With back-fill: point nextOccurrenceAt at the past anchor so the engine
    // catches up from there. Otherwise: skip to the next future occurrence.
    const initialNextOccurrence = shouldBackfill
        ? anchor
        : anchor.getTime() > now.getTime()
          ? anchor
          : computeNextOccurrence(
                anchor,
                data.scheduleUnit as ScheduleUnit,
                data.scheduleInterval,
                now,
            );
    const initialNextOccurrenceIso = formatISO(new UTCDate(initialNextOccurrence));

    const audit = initialAuditFields({ userId });

    // Atomic batch: template first (rule FK references it), then rule.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.batch([
        client.insert(expenseTemplates).values({
            id: templateId,
            userId,
            vaultId: data.vaultId,
            name: data.name,
            icon: data.icon ?? '🔁',
            iconType: 'emoji',
            defaultNote: data.defaultNote ?? null,
            defaultAmount: data.defaultAmount,
            defaultCategoryName: data.defaultCategoryName,
            defaultPaymentType: data.defaultPaymentType ?? 'cash',
            defaultPaidBy: data.defaultPaidBy ?? null,
            defaultFundId: data.defaultFundId ?? null,
            defaultFundPaymentMode: data.defaultFundPaymentMode ?? null,
            usageCount: 0,
            ...audit,
        }),
        client.insert(recurringExpenses).values({
            id: ruleId,
            vaultId: data.vaultId,
            templateId,
            name: data.name,
            amountOverride: null,
            scheduleUnit: data.scheduleUnit,
            scheduleInterval: data.scheduleInterval,
            anchorDate: data.anchorDate,
            generationMode: data.generationMode,
            status: 'active',
            endDate: data.endDate ?? null,
            endAfterCount: data.endAfterCount ?? null,
            nextOccurrenceAt: initialNextOccurrenceIso,
            occurrenceCount: 0,
            ...audit,
        }),
    ] as any);

    // Materialize back-fill synchronously via the engine. Same code path as the
    // cron / lazy catch-up, so fund integration + per-mode artifact creation
    // are handled uniformly. Engine's own MAX_CATCHUP_PER_RULE (50) applies.
    let backfilled = 0;
    let backfillErrors: Array<{ ruleId: string; message: string }> = [];
    if (shouldBackfill) {
        const result = await processDueRecurringExpenses(env, { ruleId });
        backfilled = result.autoCreated + result.queued;
        backfillErrors = result.errors;
    }

    return {
        templateId,
        ruleId,
        backfilled,
        backfillErrors,
    };
};
