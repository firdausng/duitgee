import { Hono } from 'hono';
import * as v from 'valibot';
import { describeRoute, resolver } from 'hono-openapi';
import { vValidator } from '@hono/valibot-validator';
import {
    createRecurringExpenseSchema,
    createRecurringExpenseWithTemplateSchema,
    updateRecurringExpenseSchema,
    deleteRecurringExpenseSchema,
    pauseRecurringExpenseSchema,
    resumeRecurringExpenseSchema,
    skipNextOccurrenceSchema,
    approvePendingOccurrenceSchema,
    skipPendingOccurrenceSchema,
    getRecurringExpensesQuerySchema,
    getRecurringExpenseQuerySchema,
    getPendingOccurrencesQuerySchema,
    getUpcomingOccurrencesQuerySchema,
} from '$lib/schemas/recurringExpenses';
import { createRecurringExpense } from './createRecurringExpenseHandler';
import { createRecurringExpenseWithTemplate } from './createRecurringExpenseWithTemplateHandler';
import { updateRecurringExpense } from './updateRecurringExpenseHandler';
import { deleteRecurringExpense } from './deleteRecurringExpenseHandler';
import { pauseRecurringExpense } from './pauseRecurringExpenseHandler';
import { resumeRecurringExpense } from './resumeRecurringExpenseHandler';
import { skipNextOccurrence } from './skipNextOccurrenceHandler';
import { approvePendingOccurrence } from './approvePendingOccurrenceHandler';
import { skipPendingOccurrence } from './skipPendingOccurrenceHandler';
import { getRecurringExpenses } from './getRecurringExpensesHandler';
import { getRecurringExpense } from './getRecurringExpenseHandler';
import { getPendingOccurrences } from './getPendingOccurrencesHandler';
import { getUpcomingOccurrences } from './getUpcomingOccurrencesHandler';

const RECURRING_TAG = ['Recurring Expense'];
const common = { tags: RECURRING_TAG };

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

export const recurringExpensesApi = new Hono<App.Api>()
    .get(
        '/getRecurringExpenses',
        describeRoute({ ...common, description: 'Get recurring rules for a vault' }),
        vValidator('query', getRecurringExpensesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getRecurringExpenses(session, query, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('fetching recurring rules')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .get(
        '/getRecurringExpense',
        describeRoute({ ...common, description: 'Get a single recurring rule' }),
        vValidator('query', getRecurringExpenseQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getRecurringExpense(session, query, c.env);
                if (!data) return c.json({ success: false, error: 'Not found' }, 404);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('fetching recurring rule')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .get(
        '/getPendingOccurrences',
        describeRoute({ ...common, description: 'Get pending recurring occurrences awaiting approval' }),
        vValidator('query', getPendingOccurrencesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getPendingOccurrences(session, query, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('fetching pending occurrences')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .get(
        '/getUpcomingOccurrences',
        describeRoute({ ...common, description: 'Project upcoming occurrences for active rules' }),
        vValidator('query', getUpcomingOccurrencesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await getUpcomingOccurrences(session, query, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('projecting upcoming occurrences')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/createRecurringExpense',
        describeRoute({ ...common, description: 'Create a recurring rule', responses: { 201: { description: 'Created', content: { 'application/json': { schema: successResolver } } } } }),
        vValidator('json', createRecurringExpenseSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await createRecurringExpense(session, body, c.env);
                return c.json({ success: true, data }, 201);
            } catch (error) {
                const { message, status } = errorHandler('creating recurring rule')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/createRecurringExpenseWithTemplate',
        describeRoute({ ...common, description: 'Create a recurring rule and its backing template atomically' }),
        vValidator('json', createRecurringExpenseWithTemplateSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await createRecurringExpenseWithTemplate(session, body, c.env);
                return c.json({ success: true, data }, 201);
            } catch (error) {
                const { message, status } = errorHandler('creating recurring rule')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/updateRecurringExpense',
        describeRoute({ ...common, description: 'Update a recurring rule' }),
        vValidator('json', updateRecurringExpenseSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await updateRecurringExpense(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('updating recurring rule')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/deleteRecurringExpense',
        describeRoute({ ...common, description: 'Soft delete a recurring rule' }),
        vValidator('json', deleteRecurringExpenseSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await deleteRecurringExpense(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('deleting recurring rule')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/pauseRecurringExpense',
        describeRoute({ ...common, description: 'Pause a recurring rule' }),
        vValidator('json', pauseRecurringExpenseSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await pauseRecurringExpense(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('pausing recurring rule')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/resumeRecurringExpense',
        describeRoute({ ...common, description: 'Resume a paused recurring rule' }),
        vValidator('json', resumeRecurringExpenseSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await resumeRecurringExpense(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('resuming recurring rule')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/skipNextOccurrence',
        describeRoute({ ...common, description: 'Skip the next auto-generated occurrence of a rule' }),
        vValidator('json', skipNextOccurrenceSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await skipNextOccurrence(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('skipping next occurrence')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/approvePendingOccurrence',
        describeRoute({ ...common, description: 'Approve a pending recurring occurrence → creates expense' }),
        vValidator('json', approvePendingOccurrenceSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await approvePendingOccurrence(session, body, c.env);
                return c.json({ success: true, data }, 201);
            } catch (error) {
                const { message, status } = errorHandler('approving pending occurrence')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    )
    .post(
        '/skipPendingOccurrence',
        describeRoute({ ...common, description: 'Skip a pending recurring occurrence without creating an expense' }),
        vValidator('json', skipPendingOccurrenceSchema),
        async (c) => {
            const session = c.get('currentSession');
            const body = c.req.valid('json');
            try {
                const data = await skipPendingOccurrence(session, body, c.env);
                return c.json({ success: true, data });
            } catch (error) {
                const { message, status } = errorHandler('skipping pending occurrence')(error);
                return c.json({ success: false, error: message }, status as 400);
            }
        },
    );
