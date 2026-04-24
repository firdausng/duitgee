import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringExpenses, expenseTemplates } from '$lib/server/db/schema';
import { and, eq, isNull, count } from 'drizzle-orm';
import { parseISO, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { initialAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement, checkVaultEntitlement } from '$lib/server/utils/entitlements';
import {
    computeNextOccurrence,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import type { CreateRecurringExpenseRequest } from '$lib/schemas/recurringExpenses';

export const createRecurringExpense = async (
    session: App.AuthSession,
    data: CreateRecurringExpenseRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageRecurring', env);
    await requireVaultEntitlement(session, data.vaultId, 'recurring:create', env);

    // Template belongs to this vault and is not soft-deleted
    const [template] = await client
        .select()
        .from(expenseTemplates)
        .where(
            and(
                eq(expenseTemplates.id, data.templateId),
                eq(expenseTemplates.vaultId, data.vaultId),
                isNull(expenseTemplates.deletedAt),
            ),
        )
        .limit(1);
    if (!template) {
        throw new Error('Template not found for this vault');
    }

    // Gate: every-N intervals require Pro
    if (data.scheduleInterval > 1) {
        await requireVaultEntitlement(session, data.vaultId, 'recurring:custom_interval', env);
    }

    // Gate: auto mode requires Pro
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

    // The initial nextOccurrenceAt is the anchor itself (first occurrence).
    // If the anchor is already in the past, processDueRecurringExpenses will
    // immediately catch it up on the next run.
    const anchor = parseISO(data.anchorDate);
    const now = new UTCDate();
    // If anchor is in the past, set nextOccurrence to the next future occurrence
    // (we do NOT back-fill missed past occurrences — matches resume semantics).
    const nextOccurrence =
        anchor.getTime() > now.getTime()
            ? anchor
            : computeNextOccurrence(
                  anchor,
                  data.scheduleUnit as ScheduleUnit,
                  data.scheduleInterval,
                  now,
              );

    const [rule] = await client
        .insert(recurringExpenses)
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
            endAfterCount: data.endAfterCount ?? null,
            nextOccurrenceAt: formatISO(new UTCDate(nextOccurrence)),
            occurrenceCount: 0,
            ...initialAuditFields({ userId }),
        })
        .returning();

    return rule;
};
