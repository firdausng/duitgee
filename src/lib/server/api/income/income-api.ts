import { Hono } from 'hono';
import * as v from 'valibot';
import { describeRoute, resolver } from 'hono-openapi';
import { vValidator } from '@hono/valibot-validator';
import {
    createIncomeSourceSchema,
    updateIncomeSourceSchema,
    deleteIncomeSourceSchema,
    getIncomeSourcesQuerySchema,
    getIncomeSourceQuerySchema,
    createIncomeEntrySchema,
    createIncomeEntryWithSourceSchema,
    updateIncomeEntrySchema,
    deleteIncomeEntrySchema,
    getIncomeEntriesQuerySchema,
    getIncomeEntryQuerySchema,
} from '$lib/schemas/income';
import { createIncomeSource } from './createIncomeSourceHandler';
import { updateIncomeSource } from './updateIncomeSourceHandler';
import { deleteIncomeSource } from './deleteIncomeSourceHandler';
import { getIncomeSources } from './getIncomeSourcesHandler';
import { getIncomeSource } from './getIncomeSourceHandler';
import { createIncomeEntry } from './createIncomeEntryHandler';
import { createIncomeEntryWithSource } from './createIncomeEntryWithSourceHandler';
import { updateIncomeEntry } from './updateIncomeEntryHandler';
import { deleteIncomeEntry } from './deleteIncomeEntryHandler';
import { getIncomeEntries } from './getIncomeEntriesHandler';
import { getIncomeEntry } from './getIncomeEntryHandler';

const INCOME_TAG = ['Income'];
const common = { tags: INCOME_TAG };

const successResolver = resolver(
    v.object({ success: v.boolean(), data: v.any() }),
);

function errorHandler(action: string) {
    return (error: unknown) => {
        console.error({ message: `Error ${action}`, error });
        const message = error instanceof Error ? error.message : 'Unexpected error';
        const status =
            message.toLowerCase().includes('not found')
                ? 404
                : message.toLowerCase().includes('permission') || message.toLowerCase().includes('entitlement')
                ? 403
                : 400;
        return { message, status };
    };
}

export const incomeApi = new Hono<App.Api>()
    // ── Sources ────────────────────────────────────────────────────────
    .get(
        '/getIncomeSources',
        describeRoute({ ...common, description: 'List income sources for a vault' }),
        vValidator('query', getIncomeSourcesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getIncomeSources(session, query, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('fetching income sources')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .get(
        '/getIncomeSource',
        describeRoute({ ...common, description: 'Get a single income source' }),
        vValidator('query', getIncomeSourceQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getIncomeSource(session, query, c.env);
                if (!data) return c.json({ success: false, error: 'Not found' }, 404);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('fetching income source')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/createIncomeSource',
        describeRoute({ ...common, description: 'Create an income source', responses: { 201: { description: 'Created', content: { 'application/json': { schema: successResolver } } } } }),
        vValidator('json', createIncomeSourceSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await createIncomeSource(session, body, c.env);
                return c.json({ success: true, data }, 201);
            } catch (error) {
                const { message, status } = errorHandler('creating income source')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/updateIncomeSource',
        describeRoute({ ...common, description: 'Update an income source' }),
        vValidator('json', updateIncomeSourceSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await updateIncomeSource(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('updating income source')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/deleteIncomeSource',
        describeRoute({ ...common, description: 'Soft delete an income source' }),
        vValidator('json', deleteIncomeSourceSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await deleteIncomeSource(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('deleting income source')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    // ── Entries ────────────────────────────────────────────────────────
    .get(
        '/getIncomeEntries',
        describeRoute({ ...common, description: 'List income entries for a vault (optional date range + source filter)' }),
        vValidator('query', getIncomeEntriesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getIncomeEntries(session, query, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('fetching income entries')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .get(
        '/getIncomeEntry',
        describeRoute({ ...common, description: 'Get a single income entry' }),
        vValidator('query', getIncomeEntryQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getIncomeEntry(session, query, c.env);
                if (!data) return c.json({ success: false, error: 'Not found' }, 404);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('fetching income entry')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/createIncomeEntry',
        describeRoute({ ...common, description: 'Record an income entry', responses: { 201: { description: 'Created', content: { 'application/json': { schema: successResolver } } } } }),
        vValidator('json', createIncomeEntrySchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await createIncomeEntry(session, body, c.env);
                return c.json({ success: true, data }, 201);
            } catch (error) {
                const { message, status } = errorHandler('creating income entry')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/createIncomeEntryWithSource',
        describeRoute({ ...common, description: 'Create both a new income source and an entry in one batch' }),
        vValidator('json', createIncomeEntryWithSourceSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await createIncomeEntryWithSource(session, body, c.env);
                return c.json({ success: true, data }, 201);
            } catch (error) {
                const { message, status } = errorHandler('creating income source + entry')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/updateIncomeEntry',
        describeRoute({ ...common, description: 'Update an income entry' }),
        vValidator('json', updateIncomeEntrySchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await updateIncomeEntry(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('updating income entry')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/deleteIncomeEntry',
        describeRoute({ ...common, description: 'Soft delete an income entry (reverses fund top-up if linked)' }),
        vValidator('json', deleteIncomeEntrySchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await deleteIncomeEntry(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('deleting income entry')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    );
