import {Hono} from 'hono';
import * as v from "valibot";
import {describeRoute, resolver} from "hono-openapi";
import {getExpenses} from "$lib/server/api/expenses/getExpensesHandler";
import {vValidator} from "@hono/valibot-validator";
import {
    createExpenseSchema,
    listExpensesQuerySchema,
    getExpenseQuerySchema,
    updateExpenseRequestSchema,
    deleteExpenseRequestSchema
} from "$lib/schemas/expenses";
import {createExpense} from "$lib/server/api/expenses/createExpenseHandler";
import {getExpense} from "$lib/server/api/expenses/getExpenseHandler";
import {updateExpense} from "$lib/server/api/expenses/updateExpenseHandler";
import {deleteExpense} from "$lib/server/api/expenses/deleteExpenseHandler";

const EXPENSE_TAG = ['Expense'];
const commonExpenseConfig = {
    tags: EXPENSE_TAG,
};

export const expensesApi = new Hono<App.Api>()
    // Query: List expenses (GET)
    .get(
        '/getExpenses',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Get expenses list with pagination and filters',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                expenses: v.array(v.any()),
                                pagination: v.object({
                                    page: v.number(),
                                    limit: v.number(),
                                    total: v.number(),
                                    pages: v.number()
                                })
                            }))
                        },
                    },
                },
            },
        }),
        vValidator('query', listExpensesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId, page, limit, categoryId, startDate, endDate, memberIds } = c.req.valid('query');

            const memberIdsArray = memberIds ? memberIds.split(',') : undefined;

            const result = await getExpenses(vaultId, session, c.env, {
                page,
                limit,
                categoryId,
                startDate,
                endDate,
                memberIds: memberIdsArray
            });

            return c.json(result);
        }
    )
    // Query: Get expense by id (GET)
    .get(
        '/getExpense',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Get expense by id',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.any()
                            }))
                        },
                    },
                },
                404: {
                    description: 'Not Found response',
                },
            },
        }),
        vValidator('query', getExpenseQuerySchema),
        async (c) => {
            const { vaultId, id } = c.req.valid('query');

            const expense = await getExpense(vaultId, id, c.env);

            if (!expense) {
                return c.json({
                    success: false,
                    error: 'Expense not found'
                }, 404);
            }

            return c.json({
                success: true,
                data: expense
            });
        })
    // Command: Create expense (POST)
    .post(
        '/createExpense',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Create expense',
            responses: {
                201: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.any()
                            }))
                        },
                    },
                },
            },
        }),
        vValidator('json', createExpenseSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');

            const expense = await createExpense(session, data, c.env);

            return c.json({
                success: true,
                data: expense
            }, 201);
        })
    // Command: Update expense (POST)
    .post(
        '/updateExpense',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Update an existing expense',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.any()
                            }))
                        },
                    },
                },
                404: {
                    description: 'Expense not found',
                },
            },
        }),
        vValidator('json', updateExpenseRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');

            try {
                const expense = await updateExpense(session, data, c.env);
                return c.json({
                    success: true,
                    data: expense
                });
            } catch (error) {
                console.error({
                    message: 'Error updating expense',
                    error
                });
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update expense'
                }, status);
            }
        })
    // Command: Delete expense (POST)
    .post(
        '/deleteExpense',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Soft delete an expense',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.any()
                            }))
                        },
                    },
                },
                404: {
                    description: 'Expense not found',
                },
            },
        }),
        vValidator('json', deleteExpenseRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');

            try {
                const expense = await deleteExpense(session, data, c.env);
                return c.json({
                    success: true,
                    data: expense
                });
            } catch (error) {
                console.error({
                    message: 'Error deleting expense',
                    error
                });
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to delete expense'
                }, status);
            }
        })
