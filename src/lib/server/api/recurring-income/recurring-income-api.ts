import { Hono } from 'hono';
import * as v from 'valibot';
import { describeRoute, resolver } from 'hono-openapi';
import { vValidator } from '@hono/valibot-validator';
import {
    createRecurringIncomeSchema,
    updateRecurringIncomeSchema,
    pauseRecurringIncomeSchema,
    resumeRecurringIncomeSchema,
    skipNextIncomeOccurrenceSchema,
    cancelRecurringIncomeSchema,
    deleteRecurringIncomeSchema,
    approvePendingIncomeOccurrenceSchema,
    skipPendingIncomeOccurrenceSchema,
    getRecurringIncomesQuerySchema,
    getRecurringIncomeQuerySchema,
    getPendingIncomeOccurrencesQuerySchema,
    getUpcomingIncomeOccurrencesQuerySchema,
} from '$lib/schemas/recurringIncome';
import { createRecurringIncome } from './createRecurringIncomeHandler';
import { updateRecurringIncome } from './updateRecurringIncomeHandler';
import { pauseRecurringIncome } from './pauseRecurringIncomeHandler';
import { resumeRecurringIncome } from './resumeRecurringIncomeHandler';
import { skipNextIncomeOccurrence } from './skipNextIncomeOccurrenceHandler';
import { cancelRecurringIncome } from './cancelRecurringIncomeHandler';
import { deleteRecurringIncome } from './deleteRecurringIncomeHandler';
import { approvePendingIncomeOccurrence } from './approvePendingIncomeOccurrenceHandler';
import { skipPendingIncomeOccurrence } from './skipPendingIncomeOccurrenceHandler';
import { getRecurringIncomes } from './getRecurringIncomesHandler';
import { getRecurringIncome } from './getRecurringIncomeHandler';
import { getPendingIncomeOccurrences } from './getPendingIncomeOccurrencesHandler';
import { getUpcomingIncomeOccurrences } from './getUpcomingIncomeOccurrencesHandler';

const RECURRING_INCOME_TAG = ['Recurring Income'];
const common = { tags: RECURRING_INCOME_TAG };

const successResolver = resolver(v.object({ success: v.boolean(), data: v.any() }));

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

export const recurringIncomeApi = new Hono<App.Api>()
    .get(
        '/getRecurringIncomes',
        describeRoute({ ...common, description: 'List recurring income rules for a vault' }),
        vValidator('query', getRecurringIncomesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getRecurringIncomes(session, query, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('fetching recurring income')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .get(
        '/getRecurringIncome',
        describeRoute({ ...common, description: 'Get a single recurring income rule' }),
        vValidator('query', getRecurringIncomeQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getRecurringIncome(session, query, c.env);
                if (!data) return c.json({ success: false, error: 'Not found' }, 404);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('fetching recurring income')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .get(
        '/getPendingIncomeOccurrences',
        describeRoute({ ...common, description: 'List pending income occurrences awaiting approval' }),
        vValidator('query', getPendingIncomeOccurrencesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getPendingIncomeOccurrences(session, query, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('fetching pending occurrences')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .get(
        '/getUpcomingIncomeOccurrences',
        describeRoute({ ...common, description: 'Project upcoming occurrences for active income rules' }),
        vValidator('query', getUpcomingIncomeOccurrencesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getUpcomingIncomeOccurrences(session, query, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('projecting upcoming occurrences')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/createRecurringIncome',
        describeRoute({ ...common, description: 'Create a recurring income rule', responses: { 201: { description: 'Created', content: { 'application/json': { schema: successResolver } } } } }),
        vValidator('json', createRecurringIncomeSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await createRecurringIncome(session, body, c.env);
                return c.json({ success: true, data }, 201);
            } catch (error) {
                const { message, status } = errorHandler('creating recurring income')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/updateRecurringIncome',
        describeRoute({ ...common, description: 'Update a recurring income rule' }),
        vValidator('json', updateRecurringIncomeSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await updateRecurringIncome(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('updating recurring income')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/pauseRecurringIncome',
        describeRoute({ ...common, description: 'Pause a recurring income rule' }),
        vValidator('json', pauseRecurringIncomeSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await pauseRecurringIncome(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('pausing recurring income')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/resumeRecurringIncome',
        describeRoute({ ...common, description: 'Resume a paused recurring income rule' }),
        vValidator('json', resumeRecurringIncomeSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await resumeRecurringIncome(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('resuming recurring income')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/skipNextIncomeOccurrence',
        describeRoute({ ...common, description: 'Skip the next auto-generated income occurrence' }),
        vValidator('json', skipNextIncomeOccurrenceSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await skipNextIncomeOccurrence(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('skipping next income occurrence')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/cancelRecurringIncome',
        describeRoute({ ...common, description: 'End a recurring income rule (terminal)' }),
        vValidator('json', cancelRecurringIncomeSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await cancelRecurringIncome(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('cancelling recurring income')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/deleteRecurringIncome',
        describeRoute({ ...common, description: 'Soft delete a recurring income rule' }),
        vValidator('json', deleteRecurringIncomeSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await deleteRecurringIncome(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('deleting recurring income')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/approvePendingIncomeOccurrence',
        describeRoute({ ...common, description: 'Approve a pending income occurrence → creates income entry + linked deductions' }),
        vValidator('json', approvePendingIncomeOccurrenceSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await approvePendingIncomeOccurrence(session, body, c.env);
                return c.json({ success: true, data }, 201);
            } catch (error) {
                const { message, status } = errorHandler('approving pending income')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/skipPendingIncomeOccurrence',
        describeRoute({ ...common, description: 'Skip a pending income occurrence without creating an entry' }),
        vValidator('json', skipPendingIncomeOccurrenceSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await skipPendingIncomeOccurrence(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('skipping pending income')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    );
