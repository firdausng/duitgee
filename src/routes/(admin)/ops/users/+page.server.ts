import { drizzle } from 'drizzle-orm/d1';
import * as authSchema from '$lib/server/db/better-auth-schema';
import { and, count, desc, like, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ platform, url }) => {
    if (platform === undefined) {
        throw new Error('No platform');
    }
    const authClient = drizzle(platform.env.AUTH_DB, { schema: authSchema });

    const q = url.searchParams.get('q')?.trim() ?? '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const filter = q
        ? or(
              like(authSchema.user.email, `%${q}%`),
              like(authSchema.user.name, `%${q}%`),
          )
        : undefined;

    const [rows, [totalRow]] = await Promise.all([
        authClient
            .select({
                id: authSchema.user.id,
                name: authSchema.user.name,
                email: authSchema.user.email,
                emailVerified: authSchema.user.emailVerified,
                image: authSchema.user.image,
                role: authSchema.user.role,
                banned: authSchema.user.banned,
                isAnonymous: authSchema.user.isAnonymous,
                createdAt: authSchema.user.createdAt,
            })
            .from(authSchema.user)
            .where(filter)
            .orderBy(desc(authSchema.user.createdAt))
            .limit(PAGE_SIZE)
            .offset(offset),
        authClient
            .select({ n: count() })
            .from(authSchema.user)
            .where(filter),
    ]);

    return {
        users: rows,
        pagination: {
            page,
            pageSize: PAGE_SIZE,
            total: totalRow.n,
            totalPages: Math.max(1, Math.ceil(totalRow.n / PAGE_SIZE)),
        },
        query: q,
    };
};
