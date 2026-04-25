import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { notifications } from '$lib/server/db/schema';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import type { GetNotificationsQuery, NotificationItem } from '$lib/schemas/notifications';

/**
 * List notifications for the current user in this vault. Returns rows targeted
 * directly at this user PLUS vault-wide rows (`userId IS NULL`).
 */
export const getNotifications = async (
    session: App.AuthSession,
    env: Cloudflare.Env,
    query: GetNotificationsQuery,
): Promise<{ items: NotificationItem[]; unreadCount: number }> => {
    const role = await getUserVaultRole(session.user.id, query.vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;
    const limit = Math.max(1, Math.min(query.limit ?? 20, 100));

    const baseWhere = and(
        eq(notifications.vaultId, query.vaultId),
        or(eq(notifications.userId, userId), isNull(notifications.userId)),
    );

    const where = query.unreadOnly ? and(baseWhere, isNull(notifications.readAt)) : baseWhere;

    const rows = await client
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(limit);

    const [{ count }] = await client
        .select({ count: sql<number>`COUNT(*)` })
        .from(notifications)
        .where(and(baseWhere, isNull(notifications.readAt)));

    const items: NotificationItem[] = rows.map((r) => ({
        id: r.id,
        vaultId: r.vaultId,
        userId: r.userId,
        type: r.type,
        title: r.title,
        body: r.body,
        linkUrl: r.linkUrl,
        metadata: r.metadata ? safeParseJson(r.metadata) : null,
        readAt: r.readAt,
        createdAt: r.createdAt ?? '',
        createdBy: r.createdBy,
    }));

    return { items, unreadCount: count };
};

const safeParseJson = (s: string): unknown => {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
};
