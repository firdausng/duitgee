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
import type { SkipNextIncomeOccurrenceRequest } from '$lib/schemas/recurringIncome';

/**
 * Advance nextOccurrenceAt by one step without generating an income entry —
 * useful for "this month I'm not getting paid; skip ahead."
 */
export const skipNextIncomeOccurrence = async (
    session: App.AuthSession,
    data: SkipNextIncomeOccurrenceRequest,
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
    if (existing.status !== 'active' || !existing.nextOccurrenceAt) {
        throw new Error('Rule is not active');
    }

    const current = parseISO(existing.nextOccurrenceAt);
    const anchor = parseISO(existing.anchorDate);
    const next = computeNextOccurrence(
        anchor,
        existing.scheduleUnit as ScheduleUnit,
        existing.scheduleInterval,
        current,
    );

    const [updated] = await client
        .update(recurringIncome)
        .set({
            nextOccurrenceAt: formatISO(new UTCDate(next)),
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringIncome.id, data.id))
        .returning();

    return updated;
};
