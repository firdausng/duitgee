import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenses, expenseTemplates } from '$lib/server/db/schema';
import { and, eq, isNull, sql, desc } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import { clampHistoryForFree, defaultRange } from './helpers';
import type { BreakdownQuery, TemplateBreakdownItem } from '$lib/schemas/statistics';

export const getTemplateBreakdown = async (
    vaultId: string,
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: BreakdownQuery,
): Promise<TemplateBreakdownItem[]> => {
    const role = await getUserVaultRole(session.user.id, vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    const { start: defaultStart, end: defaultEnd } = defaultRange();
    const requestedStart = query.start ?? defaultStart;
    const end = query.end ?? defaultEnd;
    const { start: clampedStart } = await clampHistoryForFree(vaultId, requestedStart, env);
    const start = clampedStart ?? defaultStart;

    const client = drizzle(env.DB, { schema });

    const rows = await client
        .select({
            templateId: expenses.expenseTemplateId,
            templateName: expenseTemplates.name,
            templateIcon: expenseTemplates.icon,
            totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
            count: sql<number>`COUNT(*)`,
        })
        .from(expenses)
        .leftJoin(expenseTemplates, eq(expenses.expenseTemplateId, expenseTemplates.id))
        .where(
            and(
                eq(expenses.vaultId, vaultId),
                isNull(expenses.deletedAt),
                sql`${expenses.date} >= ${start}`,
                sql`${expenses.date} <= ${end}`,
            ),
        )
        .groupBy(expenses.expenseTemplateId, expenseTemplates.name, expenseTemplates.icon)
        .orderBy(desc(sql`COALESCE(SUM(${expenses.amount}), 0)`));

    return rows.map((r) => ({
        templateId: r.templateId,
        templateName: r.templateName ?? 'No template',
        templateIcon: r.templateIcon ?? null,
        totalAmount: r.totalAmount,
        count: r.count,
    }));
};
