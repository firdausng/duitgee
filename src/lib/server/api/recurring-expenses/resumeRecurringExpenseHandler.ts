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
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import type { ResumeRecurringExpenseRequest } from '$lib/schemas/recurringExpenses';

export const resumeRecurringExpense = async (
    session: App.AuthSession,
    data: ResumeRecurringExpenseRequest,
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
    if (existing.status !== 'paused') throw new Error('Only paused rules can be resumed');

    // Compute next occurrence from now forward (no catch-up on missed occurrences)
    const anchor = parseISO(existing.anchorDate);
    const now = new UTCDate();
    const nextOccurrence =
        anchor.getTime() > now.getTime()
            ? anchor
            : computeNextOccurrence(
                  anchor,
                  existing.scheduleUnit as ScheduleUnit,
                  existing.scheduleInterval,
                  now,
              );

    const [resumed] = await client
        .update(recurringExpenses)
        .set({
            status: 'active',
            nextOccurrenceAt: formatISO(new UTCDate(nextOccurrence)),
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringExpenses.id, data.id))
        .returning();

    return resumed;
};
