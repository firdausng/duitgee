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

    // First occurrence = anchor; if anchor is past, jump to the next future one
    // so the engine doesn't immediately catch-up a stale history.
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

    return rule;
};
