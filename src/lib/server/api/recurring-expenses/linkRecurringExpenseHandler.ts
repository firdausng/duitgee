import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { recurringExpenses } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { LinkRecurringExpenseRequest } from '$lib/schemas/recurringExpenses';

/**
 * Sets or clears `previousRuleId` on an existing rule. Used by the manual
 * "Link to previous rule" picker on the rule detail page, and any other flow
 * that wants to retroactively attach a rule to its lineage.
 *
 * Cycle prevention: walking up the target's ancestor chain must not encounter
 * the current rule. Rejects with "Linking would create a loop" if so.
 */
export const linkRecurringExpense = async (
    session: App.AuthSession,
    data: LinkRecurringExpenseRequest,
    env: Cloudflare.Env,
) => {
    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;

    await requireVaultPermission(session, data.vaultId, 'canManageRecurring', env);

    const [rule] = await client
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
    if (!rule) throw new Error('Recurring expense not found');

    if (data.previousRuleId === rule.id) {
        throw new Error('A rule cannot reference itself as previous');
    }

    if (data.previousRuleId) {
        // Target must exist in the same vault.
        const [target] = await client
            .select()
            .from(recurringExpenses)
            .where(
                and(
                    eq(recurringExpenses.id, data.previousRuleId),
                    eq(recurringExpenses.vaultId, data.vaultId),
                    isNull(recurringExpenses.deletedAt),
                ),
            )
            .limit(1);
        if (!target) throw new Error('Target rule not found in this vault');

        // Walk up the target's ancestor chain — if we hit `rule.id`, it's a loop.
        // Chains are short in practice; bound the walk at 32 hops as a defensive cap.
        let cursor: string | null = target.previousRuleId;
        let hops = 0;
        while (cursor && hops < 32) {
            if (cursor === rule.id) {
                throw new Error('Linking would create a loop');
            }
            const [parent] = await client
                .select({ previousRuleId: recurringExpenses.previousRuleId })
                .from(recurringExpenses)
                .where(eq(recurringExpenses.id, cursor))
                .limit(1);
            cursor = parent?.previousRuleId ?? null;
            hops++;
        }
    }

    const [updated] = await client
        .update(recurringExpenses)
        .set({
            previousRuleId: data.previousRuleId,
            ...updateAuditFields({ userId }),
        })
        .where(eq(recurringExpenses.id, rule.id))
        .returning();

    return updated;
};
