import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringExpenses } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { parseISO, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import {
    computeNextOccurrence,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import type { UpdateRecurringExpenseRequest } from '$lib/schemas/recurringExpenses';

export const updateRecurringExpense = async (
    session: App.AuthSession,
    data: UpdateRecurringExpenseRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageRecurring', env);

    const [existing] = await client
        .select()
        .from(recurringExpenses)
        .where(
            and(
                eq(recurringExpenses.id, data.id),
                eq(recurringExpenses.vaultId, data.vaultId),
                isNull(recurringExpenses.deletedAt),
            ),
        )
        .limit(1);
    if (!existing) throw new Error('Recurring expense not found');

    const next = {
        name: data.name !== undefined ? data.name : existing.name,
        amountOverride: data.amountOverride !== undefined ? data.amountOverride : existing.amountOverride,
        scheduleUnit: data.scheduleUnit ?? (existing.scheduleUnit as ScheduleUnit),
        scheduleInterval: data.scheduleInterval ?? existing.scheduleInterval,
        anchorDate: data.anchorDate ?? existing.anchorDate,
        generationMode: data.generationMode ?? existing.generationMode,
        endDate: data.endDate !== undefined ? data.endDate : existing.endDate,
        endAfterCount: data.endAfterCount !== undefined ? data.endAfterCount : existing.endAfterCount,
    };

    if (next.scheduleInterval > 1 && existing.scheduleInterval <= 1) {
        await requireVaultEntitlement(session, data.vaultId, 'recurring:custom_interval', env);
    }
    if (next.generationMode === 'auto' && existing.generationMode !== 'auto') {
        await requireVaultEntitlement(session, data.vaultId, 'recurring:auto_generation', env);
    }

    // If the schedule changed, recompute nextOccurrenceAt from `now` forward.
    const scheduleChanged =
        next.scheduleUnit !== existing.scheduleUnit ||
        next.scheduleInterval !== existing.scheduleInterval ||
        next.anchorDate !== existing.anchorDate;

    let nextOccurrenceAt = existing.nextOccurrenceAt;
    if (scheduleChanged && existing.status === 'active') {
        const anchor = parseISO(next.anchorDate);
        const now = new UTCDate();
        const n =
            anchor.getTime() > now.getTime()
                ? anchor
                : computeNextOccurrence(anchor, next.scheduleUnit, next.scheduleInterval, now);
        nextOccurrenceAt = formatISO(new UTCDate(n));
    }

    const [updated] = await client
        .update(recurringExpenses)
        .set({
            ...next,
            nextOccurrenceAt,
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringExpenses.id, data.id))
        .returning();

    return updated;
};
