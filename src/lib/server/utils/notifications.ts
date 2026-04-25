import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { notifications, vaultMembers } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export interface NotificationInput {
    vaultId: string;
    type: string;
    title: string;
    body?: string;
    linkUrl?: string;
    metadata?: unknown;
    /** User who triggered the notification — also used as `createdBy`. */
    createdBy: string;
}

interface VaultNotificationInput extends NotificationInput {
    /** When set, all OTHER active members of the vault get a notification (not this user). */
    excludeUserId?: string;
}

interface UserNotificationInput extends NotificationInput {
    userId: string;
}

const serializeMetadata = (meta: unknown): string | null => {
    if (meta === undefined || meta === null) return null;
    try {
        return JSON.stringify(meta);
    } catch {
        return null;
    }
};

/**
 * Fan-out a notification to every ACTIVE member of a vault except `excludeUserId`.
 * Best-effort: failures are logged but never thrown — callers shouldn't roll back
 * the underlying action because notification delivery wobbled.
 */
export const notifyVault = async (
    env: Cloudflare.Env,
    input: VaultNotificationInput,
): Promise<void> => {
    const client = drizzle(env.DB, { schema });

    try {
        const memberRows = await client
            .select({ userId: vaultMembers.userId })
            .from(vaultMembers)
            .where(
                and(eq(vaultMembers.vaultId, input.vaultId), eq(vaultMembers.status, 'active')),
            );

        const targets = memberRows
            .map((r) => r.userId)
            .filter((id) => id !== input.excludeUserId);

        if (targets.length === 0) return;

        const metadata = serializeMetadata(input.metadata);
        const rows = targets.map((userId) => ({
            id: createId(),
            vaultId: input.vaultId,
            userId,
            type: input.type,
            title: input.title,
            body: input.body ?? null,
            linkUrl: input.linkUrl ?? null,
            metadata,
            createdBy: input.createdBy,
        }));

        await client.insert(notifications).values(rows);
    } catch (err) {
        console.warn('notifyVault failed:', err);
    }
};

/**
 * Send a notification to a single user. Best-effort.
 */
export const notifyUser = async (
    env: Cloudflare.Env,
    input: UserNotificationInput,
): Promise<void> => {
    const client = drizzle(env.DB, { schema });

    try {
        await client.insert(notifications).values({
            id: createId(),
            vaultId: input.vaultId,
            userId: input.userId,
            type: input.type,
            title: input.title,
            body: input.body ?? null,
            linkUrl: input.linkUrl ?? null,
            metadata: serializeMetadata(input.metadata),
            createdBy: input.createdBy,
        });
    } catch (err) {
        console.warn('notifyUser failed:', err);
    }
};
