import {Hono} from 'hono';
import * as v from "valibot";
import {describeRoute, resolver} from "hono-openapi";
import {vValidator} from "@hono/valibot-validator";
import {
    createBudgetSchema,
    updateBudgetSchema,
    deleteBudgetSchema,
    getBudgetsQuerySchema,
    getBudgetQuerySchema
} from "$lib/schemas/budgets";
import {createBudget} from "./createBudgetHandler";
import {getBudgets} from "./getBudgetsHandler";
import {getBudget} from "./getBudgetHandler";
import {updateBudget} from "./updateBudgetHandler";
import {deleteBudget} from "./deleteBudgetHandler";

const BUDGET_TAG = ['Budget'];
const commonBudgetConfig = {
    tags: BUDGET_TAG,
};

export const budgetsApi = new Hono<App.Api>()
    // Command: Create budget (POST)
    .post(
        '/createBudget',
        describeRoute({
            ...commonBudgetConfig,
            description: 'Create a new budget for a vault',
            responses: {
                201: {
                    description: 'Budget created successfully',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.any()
                            }))
                        },
                    },
                },
                400: {
                    description: 'Invalid request',
                },
                403: {
                    description: 'Permission denied',
                },
            },
        }),
        vValidator('json', createBudgetSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');

            try {
                const budget = await createBudget(session, data, c.env);
                return c.json({
                    success: true,
                    data: budget
                }, 201);
            } catch (error) {
                console.error({
                    message: 'Error creating budget',
                    error
                });
                const status = error instanceof Error && error.message.includes('Permission denied') ? 403 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to create budget'
                }, status);
            }
        })
    // Query: Get budgets for a vault (GET)
    .get(
        '/getBudgets',
        describeRoute({
            ...commonBudgetConfig,
            description: 'Get all budgets for a vault',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.array(v.any())
                            }))
                        },
                    },
                },
                404: {
                    description: 'Vault not found or no access',
                },
            },
        }),
        vValidator('query', getBudgetsQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');

            try {
                const budgetList = await getBudgets(session, query, c.env);
                return c.json({
                    success: true,
                    data: budgetList
                });
            } catch (error) {
                console.error({
                    message: 'Error fetching budgets',
                    error
                });
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch budgets'
                }, status);
            }
        })
    // Query: Get single budget (GET)
    .get(
        '/getBudget',
        describeRoute({
            ...commonBudgetConfig,
            description: 'Get a specific budget',
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
                    description: 'Budget not found',
                },
            },
        }),
        vValidator('query', getBudgetQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');

            try {
                const budget = await getBudget(session, query, c.env);
                return c.json({
                    success: true,
                    data: budget
                });
            } catch (error) {
                console.error({
                    message: 'Error fetching budget',
                    error
                });
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch budget'
                }, status);
            }
        })
    // Command: Update budget (POST)
    .post(
        '/updateBudget',
        describeRoute({
            ...commonBudgetConfig,
            description: 'Update an existing budget',
            responses: {
                200: {
                    description: 'Budget updated successfully',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.any()
                            }))
                        },
                    },
                },
                403: {
                    description: 'Permission denied',
                },
                404: {
                    description: 'Budget not found',
                },
            },
        }),
        vValidator('json', updateBudgetSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');

            try {
                const budget = await updateBudget(session, data, c.env);
                return c.json({
                    success: true,
                    data: budget
                });
            } catch (error) {
                console.error({
                    message: 'Error updating budget',
                    error
                });
                const status = error instanceof Error && error.message.includes('Permission denied') ? 403 :
                               error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update budget'
                }, status);
            }
        })
    // Command: Delete budget (POST)
    .post(
        '/deleteBudget',
        describeRoute({
            ...commonBudgetConfig,
            description: 'Soft delete a budget',
            responses: {
                200: {
                    description: 'Budget deleted successfully',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.any()
                            }))
                        },
                    },
                },
                403: {
                    description: 'Permission denied',
                },
                404: {
                    description: 'Budget not found',
                },
            },
        }),
        vValidator('json', deleteBudgetSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');

            try {
                const budget = await deleteBudget(session, data, c.env);
                return c.json({
                    success: true,
                    data: budget
                });
            } catch (error) {
                console.error({
                    message: 'Error deleting budget',
                    error
                });
                const status = error instanceof Error && error.message.includes('Permission denied') ? 403 :
                               error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to delete budget'
                }, status);
            }
        });
