import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringIncome } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { parseISO, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import {
    computeNextOccurrence,
    type ScheduleUnit,
} from '$lib/utils/recurringSchedule';
import type { ResumeRecurringIncomeRequest } from '$lib/schemas/recurringIncome';

export const resumeRecurringIncome = async (
    session: App.AuthSession,
    data: ResumeRecurringIncomeRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageIncome', env);

    const [existing] = await client
        .select()
        .from(recurringIncome)
        .where(
            and(
                eq(recurringIncome.id, data.id),
                eq(recurringIncome.vaultId, data.vaultId),
                isNull(recurringIncome.deletedAt),
            ),
        )
        .limit(1);
    if (!existing) throw new Error('Recurring income not found');
    if (existing.status === 'ended') throw new Error('Cannot resume an ended rule');

    // Recompute next from anchor + interval, jumping past any missed history
    // (matches expense resume semantics — we don't back-fill on resume).
    const anchor = parseISO(existing.anchorDate);
    const now = new UTCDate();
    const next =
        anchor.getTime() > now.getTime()
            ? anchor
            : computeNextOccurrence(
                  anchor,
                  existing.scheduleUnit as ScheduleUnit,
                  existing.scheduleInterval,
                  now,
              );

    const [resumed] = await client
        .update(recurringIncome)
        .set({
            status: 'active',
            nextOccurrenceAt: formatISO(new UTCDate(next)),
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringIncome.id, data.id))
        .returning();

    return resumed;
};
