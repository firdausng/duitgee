import {Hono} from 'hono';
import * as v from "valibot";
import {describeRoute, resolver} from "hono-openapi";
import {getExpenses} from "$lib/server/api/expenses/getExpensesHandler";
import {vValidator} from "@hono/valibot-validator";
import {createExpenseSchema} from "$lib/schemas/expenses";
import {createExpense} from "$lib/server/api/expenses/createExpenseHandler";
import {getExpense} from "$lib/server/api/expenses/getExpenseHandler";

const EXPENSE_TAG = ['Expense'];
const commonExpenseConfig = {
    tags: EXPENSE_TAG,
};

export const expensesApi = new Hono<App.Api>()
    .get(
        '/vaults/:vaultId/expenses',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Get expenses list with pagination and filters',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                data: v.array(v.any()),
                                pagination: v.object({
                                    page: v.number(),
                                    limit: v.number(),
                                    total: v.number(),
                                    totalPages: v.number()
                                })
                            }))
                        },
                    },
                },
            },
        }),
        async (c) =>{
            const session = c.get('currentSession');
            const vaultId = c.req.param('vaultId');
            const page = parseInt(c.req.query('page') || '1');
            const limit = parseInt(c.req.query('limit') || '10');
            const categoryId = c.req.query('categoryId');
            const startDate = c.req.query('startDate');
            const endDate = c.req.query('endDate');
            const memberIdsParam = c.req.query('memberIds');
            const memberIds = memberIdsParam ? memberIdsParam.split(',') : undefined;

            const result = await getExpenses(session.user.id, vaultId, c.env, {
                page,
                limit,
                categoryId,
                startDate,
                endDate,
                memberIds
            });

            return c.json(result);
        }
    )
    .get(
        '/vaults/:vaultId/expenses/:id',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Get expense by id',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {schema: resolver(v.any())},
                    },
                },
                404: {
                    description: 'Not Found response',
                },
            },
        }),
        async (c) => {

            const vaultId = c.req.param('vaultId');
            const id = c.req.param('id');

            const expense = await getExpense(vaultId, id, c.env);

            if (!expense) {
                return c.json({error: 'Expense not found'}, 404);
            }

            return c.json(expense);
        })
    .post(
        '/vaults/:vaultId/expenses',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Create expense',
            responses: {
                201: {
                    description: 'Successful response',
                    content: {
                        'application/json': {schema: resolver(v.any())},
                    },
                },
            },
        }),
        vValidator('json', createExpenseSchema),
        async (c) => {
            const session = c.get('currentSession');
            const vaultId = c.req.param('vaultId');
            const data = c.req.valid('json');

            const expense = await createExpense(session.user.id, {...data, vaultId}, c.env);

            return c.json(expense, 201);
        })
