import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { notifications } from '$lib/server/db/schema';
import { and, eq, isNull, or } from 'drizzle-orm';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';
import type {
    MarkNotificationReadRequest,
    MarkAllNotificationsReadRequest,
} from '$lib/schemas/notifications';

/**
 * Mark a single notification as read. Only the targeted user (or any vault
 * member, for vault-wide notifications) can mark it.
 */
export const markNotificationRead = async (
    session: App.AuthSession,
    env: Cloudflare.Env,
    data: MarkNotificationReadRequest,
): Promise<void> => {
    const client = drizzle(env.DB, { schema });

    const [row] = await client
        .select()
        .from(notifications)
        .where(eq(notifications.id, data.id))
        .limit(1);

    if (!row) throw new Error('Notification not found');

    const role = await getUserVaultRole(session.user.id, row.vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    if (row.userId !== null && row.userId !== session.user.id) {
        throw new Error('This notification belongs to another user');
    }

    if (row.readAt) return; // already read; idempotent

    await client
        .update(notifications)
        .set({ readAt: new Date().toISOString() })
        .where(eq(notifications.id, data.id));
};

/**
 * Mark every unread notification visible to the current user in this vault as read.
 */
export const markAllNotificationsRead = async (
    session: App.AuthSession,
    env: Cloudflare.Env,
    data: MarkAllNotificationsReadRequest,
): Promise<{ updated: number }> => {
    const role = await getUserVaultRole(session.user.id, data.vaultId, env);
    if (!role) throw new Error('You do not have access to this vault');

    const client = drizzle(env.DB, { schema });
    const result = await client
        .update(notifications)
        .set({ readAt: new Date().toISOString() })
        .where(
            and(
                eq(notifications.vaultId, data.vaultId),
                or(eq(notifications.userId, session.user.id), isNull(notifications.userId)),
                isNull(notifications.readAt),
            ),
        )
        .returning({ id: notifications.id });

    return { updated: result.length };
};
