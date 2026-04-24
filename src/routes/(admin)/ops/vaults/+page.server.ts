import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { vaults, vaultMembers, funds, expenses } from '$lib/server/db/schema';
import { and, count, countDistinct, desc, eq, isNull, like } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ platform, url }) => {
    if (platform === undefined) {
        throw new Error('No platform');
    }
    const client = drizzle(platform.env.DB, { schema });

    const q = url.searchParams.get('q')?.trim() ?? '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const baseWhere = and(
        isNull(vaults.deletedAt),
        q ? like(vaults.name, `%${q}%`) : undefined,
    );

    const [rows, [totalRow]] = await Promise.all([
        client
            .select({
                id: vaults.id,
                name: vaults.name,
                icon: vaults.icon,
                planId: vaults.planId,
                currency: vaults.currency,
                locale: vaults.locale,
                createdAt: vaults.createdAt,
                createdBy: vaults.createdBy,
                memberCount: countDistinct(vaultMembers.id),
                fundCount: countDistinct(funds.id),
                expenseCount: countDistinct(expenses.id),
            })
            .from(vaults)
            .leftJoin(
                vaultMembers,
                and(eq(vaultMembers.vaultId, vaults.id), eq(vaultMembers.status, 'active')),
            )
            .leftJoin(
                funds,
                and(eq(funds.vaultId, vaults.id), isNull(funds.deletedAt)),
            )
            .leftJoin(
                expenses,
                and(eq(expenses.vaultId, vaults.id), isNull(expenses.deletedAt)),
            )
            .where(baseWhere)
            .groupBy(vaults.id)
            .orderBy(desc(vaults.createdAt))
            .limit(PAGE_SIZE)
            .offset(offset),
        client.select({ n: count() }).from(vaults).where(baseWhere),
    ]);

    return {
        vaults: rows,
        pagination: {
            page,
            pageSize: PAGE_SIZE,
            total: totalRow.n,
            totalPages: Math.max(1, Math.ceil(totalRow.n / PAGE_SIZE)),
        },
        query: q,
    };
};
