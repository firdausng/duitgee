import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { incomeSources, incomeTemplates } from '$lib/server/db/schema';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import type { GetIncomeTemplatesQuery } from '$lib/schemas/income';

export const getIncomeTemplates = async (
    session: App.AuthSession,
    query: GetIncomeTemplatesQuery,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, query.vaultId, 'canViewIncome', env);

    const client = drizzle(env.DB, { schema });

    const conditions = [
        eq(incomeTemplates.vaultId, query.vaultId),
        isNull(incomeTemplates.deletedAt),
    ];
    if (query.sourceId) conditions.push(eq(incomeTemplates.sourceId, query.sourceId));
    if (query.activeOnly === 'true') conditions.push(isNull(incomeTemplates.endedAt));

    const rows = await client
        .select({
            template: incomeTemplates,
            sourceName: incomeSources.name,
            sourceIcon: incomeSources.icon,
        })
        .from(incomeTemplates)
        .leftJoin(incomeSources, eq(incomeTemplates.sourceId, incomeSources.id))
        .where(and(...conditions))
        .orderBy(desc(incomeTemplates.usageCount), desc(incomeTemplates.updatedAt));

    // Resolve lineage parents in one batched lookup. Drizzle's self-aliased
    // join breaks return-type inference; the batched secondary lookup is
    // both safer and explicit about the N parent reads.
    const parentIds = Array.from(
        new Set(
            rows
                .map((r) => r.template.previousTemplateId)
                .filter((id): id is string => Boolean(id)),
        ),
    );
    const parentMap = new Map<string, { name: string; icon: string | null; endedAt: string | null }>();
    if (parentIds.length > 0) {
        const parents = await client
            .select({
                id: incomeTemplates.id,
                name: incomeTemplates.name,
                icon: incomeTemplates.icon,
                endedAt: incomeTemplates.endedAt,
            })
            .from(incomeTemplates)
            .where(inArray(incomeTemplates.id, parentIds));
        for (const p of parents) {
            parentMap.set(p.id, { name: p.name, icon: p.icon, endedAt: p.endedAt });
        }
    }

    return rows.map((r) => {
        const parent = r.template.previousTemplateId
            ? parentMap.get(r.template.previousTemplateId) ?? null
            : null;
        return {
            ...r.template,
            source: { name: r.sourceName, icon: r.sourceIcon },
            previousTemplate: parent
                ? {
                      id: r.template.previousTemplateId!,
                      name: parent.name,
                      icon: parent.icon,
                      endedAt: parent.endedAt,
                  }
                : null,
        };
    });
};
