import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { processDueRecurringExpenses } from './processDueRecurringExpenses';
import { getRecurringExpenses } from './getRecurringExpensesHandler';
import { getUpcomingOccurrences } from './getUpcomingOccurrencesHandler';
import { getPendingOccurrences } from './getPendingOccurrencesHandler';
import type { GetRecurringSummaryQuery } from '$lib/schemas/recurringExpenses';

/**
 * Combined dashboard payload for the vault home page — collapses three
 * round-trips (rules / upcoming / pending) into one. Permission and the lazy
 * catch-up run once up front so the parallel sub-queries see consistent state.
 */
export const getRecurringSummary = async (
    session: App.AuthSession,
    query: GetRecurringSummaryQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canManageRecurring', env);
    await processDueRecurringExpenses(env, { vaultId: query.vaultId });

    const [rules, upcoming, pending] = await Promise.all([
        getRecurringExpenses(session, { vaultId: query.vaultId }, env),
        getUpcomingOccurrences(session, { vaultId: query.vaultId, days: query.days ?? 7 }, env),
        getPendingOccurrences(session, { vaultId: query.vaultId }, env),
    ]);

    return {
        rules,
        upcoming,
        pendingCount: pending.length,
    };
};
