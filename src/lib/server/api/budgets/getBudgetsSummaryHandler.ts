import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {GetBudgetsQuery} from "$lib/schemas/budgets";
import {budgets} from "$lib/server/db/schema";
import {and, eq, isNull, sql} from "drizzle-orm";
import {getUserVaultRole} from "$lib/server/utils/vaultPermissions";
import {parseJsonArray} from "$lib/server/utils/json-utils";

export const getBudgetsSummary = async (
    session: App.AuthSession,
    query: GetBudgetsQuery,
    env: Cloudflare.Env
) => {

    // Check if user has access to vault
    const role = await getUserVaultRole(session.user.id, query.vaultId, env);
    if (!role) {
        throw new Error('You do not have access to this vault');
    }
    // Get budgets
    const stmt = env.DB.prepare(`
        SELECT
            b.id,
            b.name,
            b.description,
            b.amount,
            b.period,
            b.is_active as isActive,
            b.category_names as categoryNames,
            b.template_ids as expenseTemplateIds,
            b.user_ids as userIds,
            b.start_date as startDate,
            b.end_date as endDate,
            b.alert_threshold as alertThreshold,
            b.alert_enabled as alertEnabled,
            COALESCE(SUM(e.amount), 0) AS spent
        FROM budgets b
                 LEFT JOIN expenses e
                           ON e.vault_id = b.vault_id
                               AND e.date >= b.start_date
                               AND (b.end_date IS NULL OR e.date <= b.end_date)
                               AND (
                                  b.category_names IS NULL
                                      OR EXISTS (
                                      SELECT 1
                                      FROM json_each(b.category_names)
                                      WHERE json_each.value = e.category_id
                                  )
                                  )
                               AND (
                                  b.template_ids IS NULL
                                      OR EXISTS (
                                      SELECT 1
                                      FROM json_each(b.template_ids)
                                      WHERE json_each.value = e.expense_template_id
                                  )
                                  )
                               AND (
                                  b.user_ids IS NULL
                                      OR EXISTS (
                                      SELECT 1
                                      FROM json_each(b.user_ids)
                                      WHERE json_each.value = e.user_id
                                  )
                                  )
        WHERE
            b.vault_id = ?
          AND b.is_active = 1
          AND b.deleted_at IS NULL
        GROUP BY b.id;
    `);

    const result = await stmt.bind(query.vaultId).run();
    const rows = result.results;
    const budgets = rows.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        amount: b.amount,
        period: b.period,
        isActive: Boolean(b.isActive),
        categoryNames: parseJsonArray(b.categoryNames),
        templateIds: parseJsonArray(b.expenseTemplateIds),
        userIds: parseJsonArray(b.userIds),
        startDate: b.startDate,
        endDate: b.endDate,
        alertThreshold: b.alertThreshold,
        alertEnabled: Boolean(b.alertEnabled),
        spent: b.spent,
    }));

    return budgets;
};

