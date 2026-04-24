import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringExpenses, expenseTemplates, pendingRecurringOccurrences } from '$lib/server/db/schema';
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
import type { CreateRecurringExpenseWithTemplateRequest } from '$lib/schemas/recurringExpenses';

const BACKFILL_CAP = 12;

/**
 * Create a recurring rule and its backing template in a single atomic D1 batch.
 * This is the primary entry point for the /recurring/new UI — users never need
 * to create a template separately.
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
    if ((activeCount?.n ?? 0) >= 1) {
        const canMultiple = await checkVaultEntitlement(
            data.vaultId,
            'recurring:create_multiple',
            env,
        );
        if (!canMultiple) {
            throw new Error(
                'Free plan allows only 1 active recurring rule per vault. Upgrade to Pro to add more.',
            );
        }
    }

    // Pre-generate IDs so both inserts can reference each other in the batch.
    const templateId = createId();
    const ruleId = createId();

    // Compute initial nextOccurrenceAt from anchor.
    const anchor = parseISO(data.anchorDate);
    const now = new UTCDate();
    const nextOccurrence =
        anchor.getTime() > now.getTime()
            ? anchor
            : computeNextOccurrence(
                  anchor,
                  data.scheduleUnit as ScheduleUnit,
                  data.scheduleInterval,
                  now,
              );
    const nextOccurrenceIso = formatISO(new UTCDate(nextOccurrence));

    // Back-fill past occurrences (queue mode only). Walk from anchor forward,
    // capped at BACKFILL_CAP items. Stops once the cursor passes `now`.
    const backfillDueDates: string[] = [];
    if (data.backfill && data.generationMode === 'queue' && anchor.getTime() <= now.getTime()) {
        let cursor = anchor;
        while (
            backfillDueDates.length < BACKFILL_CAP &&
            cursor.getTime() <= now.getTime()
        ) {
            backfillDueDates.push(formatISO(new UTCDate(cursor)));
            const nextCursor = computeNextOccurrence(
                anchor,
                data.scheduleUnit as ScheduleUnit,
                data.scheduleInterval,
                cursor,
            );
            if (nextCursor.getTime() <= cursor.getTime()) break; // safety: no progress
            cursor = nextCursor;
        }
    }

    const audit = initialAuditFields({ userId });

    // Atomic batch: template → rule (FK to template) → back-fill pending rows (FK to rule).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchOps: any[] = [
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
            nextOccurrenceAt: nextOccurrenceIso,
            // Count back-filled items — they're real occurrences against end-after limits.
            occurrenceCount: backfillDueDates.length,
            ...audit,
        }),
    ];

    for (const dueDate of backfillDueDates) {
        batchOps.push(
            client.insert(pendingRecurringOccurrences).values({
                id: createId(),
                vaultId: data.vaultId,
                recurringExpenseId: ruleId,
                dueDate,
                suggestedAmount: data.defaultAmount,
                status: 'pending',
                ...audit,
            }),
        );
    }

    await client.batch(batchOps as [typeof batchOps[0], ...typeof batchOps]);

    return {
        templateId,
        ruleId,
        backfilled: backfillDueDates.length,
    };
};
