import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenseTags, expenseTagAssignments } from '$lib/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getUserVaultRole, getVaultPermissions } from '$lib/server/utils/vaultPermissions';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
    if (platform === undefined) throw new Error('No platform');
    if (!locals.currentUser) throw error(401, 'Unauthorized');

    const vaultId = params.vaultId;
    const session = locals.currentSession;

    const role = await getUserVaultRole(session.user.id, vaultId, platform.env);
    if (!role) throw error(403, 'You do not have access to this vault');
    const permissions = getVaultPermissions(role);

    const client = drizzle(platform.env.DB, { schema });

    // Tags + usage counts (LEFT JOIN so tags with zero usage still show up)
    const rows = await client
        .select({
            id: expenseTags.id,
            name: expenseTags.name,
            color: expenseTags.color,
            isSystem: expenseTags.isSystem,
            createdAt: expenseTags.createdAt,
            usageCount: sql<number>`COUNT(${expenseTagAssignments.expenseId})`,
        })
        .from(expenseTags)
        .leftJoin(expenseTagAssignments, eq(expenseTagAssignments.tagId, expenseTags.id))
        .where(and(
            eq(expenseTags.vaultId, vaultId),
            isNull(expenseTags.deletedAt),
        ))
        .groupBy(expenseTags.id, expenseTags.name, expenseTags.color, expenseTags.isSystem, expenseTags.createdAt)
        .orderBy(expenseTags.name);

    return {
        vaultId,
        role,
        permissions,
        tags: rows,
    };
};
