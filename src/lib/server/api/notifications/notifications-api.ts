import { Hono } from 'hono';
import * as v from 'valibot';
import { describeRoute, resolver } from 'hono-openapi';
import { vValidator } from '@hono/valibot-validator';
import {
    getNotificationsQuerySchema,
    markNotificationReadSchema,
    markAllNotificationsReadSchema,
} from '$lib/schemas/notifications';
import { getNotifications } from './getNotificationsHandler';
import {
    markNotificationRead,
    markAllNotificationsRead,
} from './markNotificationReadHandler';

const TAG = ['Notifications'];
const commonConfig = { tags: TAG };

const handle = async <T>(
    c: { json: (body: unknown, status?: number) => Response },
    fn: () => Promise<T>,
) => {
    try {
        const data = await fn();
        return c.json({ success: true, data });
    } catch (error) {
        console.error({ message: 'Notifications handler error', error });
        const status = error instanceof Error && error.message.toLowerCase().includes('access')
            ? 403
            : error instanceof Error && error.message.toLowerCase().includes('not found')
              ? 404
              : 400;
        return c.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed' },
            status,
        );
    }
};

export const notificationsApi = new Hono<App.Api>()
    .get(
        '/getNotifications',
        describeRoute({
            ...commonConfig,
            description: 'List notifications visible to the current user in a vault.',
            responses: {
                200: { description: 'Notifications', content: { 'application/json': { schema: resolver(v.any()) } } },
            },
        }),
        vValidator('query', getNotificationsQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            return handle(c, () => getNotifications(session, c.env, query));
        },
    )
    .post(
        '/markNotificationRead',
        describeRoute({
            ...commonConfig,
            description: 'Mark a single notification as read.',
            responses: {
                200: { description: 'OK', content: { 'application/json': { schema: resolver(v.any()) } } },
            },
        }),
        vValidator('json', markNotificationReadSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            return handle(c, async () => {
                await markNotificationRead(session, c.env, data);
                return null;
            });
        },
    )
    .post(
        '/markAllNotificationsRead',
        describeRoute({
            ...commonConfig,
            description: 'Mark every unread notification visible to the current user in this vault as read.',
            responses: {
                200: { description: 'OK', content: { 'application/json': { schema: resolver(v.any()) } } },
            },
        }),
        vValidator('json', markAllNotificationsReadSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            return handle(c, () => markAllNotificationsRead(session, c.env, data));
        },
    );
