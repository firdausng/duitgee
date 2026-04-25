import * as v from 'valibot';

export const getNotificationsQuerySchema = v.object({
    vaultId: v.string(),
    limit: v.optional(v.pipe(v.string(), v.transform(Number)), '20'),
    unreadOnly: v.optional(
        v.pipe(v.string(), v.transform((s) => s === 'true')),
        'false',
    ),
});
export type GetNotificationsQuery = v.InferOutput<typeof getNotificationsQuerySchema>;

export const markNotificationReadSchema = v.object({
    id: v.string(),
});
export type MarkNotificationReadRequest = v.InferOutput<typeof markNotificationReadSchema>;

export const markAllNotificationsReadSchema = v.object({
    vaultId: v.string(),
});
export type MarkAllNotificationsReadRequest = v.InferOutput<typeof markAllNotificationsReadSchema>;

export interface NotificationItem {
    id: string;
    vaultId: string;
    userId: string | null;
    type: string;
    title: string;
    body: string | null;
    linkUrl: string | null;
    metadata: unknown;
    readAt: string | null;
    createdAt: string;
    createdBy: string;
}
