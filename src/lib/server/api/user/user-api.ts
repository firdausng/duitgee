import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { vValidator } from '@hono/valibot-validator';
import * as v from 'valibot';
import { syncDisplayName } from './syncDisplayNameHandler';

const syncDisplayNameSchema = v.object({
	displayName: v.pipe(
		v.string('Display name is required'),
		v.minLength(1, 'Display name is required')
	)
});

export const userApi = new Hono<App.Api>()
	.post(
		'/syncDisplayName',
		describeRoute({
			tags: ['User'],
			description: 'Sync user display name across all vault memberships',
			responses: {
				200: {
					description: 'Display name synced successfully',
					content: {
						'application/json': {
							schema: v.object({
								success: v.boolean(),
								count: v.number(),
								message: v.string()
							})
						}
					}
				}
			}
		}),
		vValidator('json', syncDisplayNameSchema),
		async (c) => {
			const session = c.get('currentSession');
			const { displayName } = c.req.valid('json');

			const result = await syncDisplayName(session, displayName, c.env);

			return c.json(result);
		}
	);
