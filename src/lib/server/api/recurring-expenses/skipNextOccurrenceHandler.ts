import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringExpenses } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { parseISO, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import {
    computeNextOccurrence,
    isScheduleExhausted,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import type { SkipNextOccurrenceRequest } from '$lib/schemas/recurringExpenses';

/**
 * Advance a rule's nextOccurrenceAt past its current due date without generating
 * an expense. Effectively skips the next auto-generation.
 */
export const skipNextOccurrence = async (
    session: App.AuthSession,
    data: SkipNextOccurrenceRequest,
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
    if (existing.status !== 'active' || !existing.nextOccurrenceAt) {
        throw new Error('Rule is not active or has no pending occurrence');
    }

    const anchor = parseISO(existing.anchorDate);
    const currentNext = parseISO(existing.nextOccurrenceAt);
    const nextDate = computeNextOccurrence(
        anchor,
        existing.scheduleUnit as ScheduleUnit,
        existing.scheduleInterval,
        currentNext,
    );
    const nextOccurrenceCount = existing.occurrenceCount + 1;
    const willExhaust = isScheduleExhausted({
        occurrenceCount: nextOccurrenceCount,
        endAfterCount: existing.endAfterCount,
        endDate: existing.endDate ? parseISO(existing.endDate) : null,
        nextOccurrenceAt: nextDate,
    });

    const [updated] = await client
        .update(recurringExpenses)
        .set({
            nextOccurrenceAt: willExhaust ? null : formatISO(new UTCDate(nextDate)),
            occurrenceCount: nextOccurrenceCount,
            status: willExhaust ? 'ended' : 'active',
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringExpenses.id, data.id))
        .returning();

    return updated;
};
