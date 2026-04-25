import {Hono} from 'hono';
import * as v from "valibot";
import {describeRoute, resolver} from "hono-openapi";
import {getExpenses} from "$lib/server/api/expenses/getExpensesHandler";
import {vValidator} from "@hono/valibot-validator";
import {
    createExpenseSchema,
    createExpensesRequestSchema,
    listExpensesQuerySchema,
    getExpenseQuerySchema,
    updateExpenseRequestSchema,
    deleteExpenseRequestSchema
} from "$lib/schemas/expenses";
import {
    exportExpensesQuerySchema,
    confirmImportPayloadSchema,
} from "$lib/schemas/csv";
import {createExpense} from "$lib/server/api/expenses/createExpenseHandler";
import {createExpenses} from "$lib/server/api/expenses/createExpensesHandler";
import {getExpense} from "$lib/server/api/expenses/getExpenseHandler";
import {updateExpense} from "$lib/server/api/expenses/updateExpenseHandler";
import {deleteExpense} from "$lib/server/api/expenses/deleteExpenseHandler";
import {exportExpenses} from "$lib/server/api/expenses/exportExpensesHandler";
import {previewImportExpenses} from "$lib/server/api/expenses/previewImportExpensesHandler";
import {
    confirmImportExpenses,
    undoImportExpenses,
} from "$lib/server/api/expenses/confirmImportExpensesHandler";
import {createUnidentifiedExpense} from "$lib/server/api/expenses/createUnidentifiedExpenseHandler";
import {findUnidentifiedDuplicates} from "$lib/server/api/expenses/findUnidentifiedDuplicatesHandler";
import {claimUnidentifiedExpense} from "$lib/server/api/expenses/claimUnidentifiedExpenseHandler";
import {getUnidentifiedExpenses} from "$lib/server/api/expenses/getUnidentifiedExpensesHandler";
import {
    createUnidentifiedExpenseSchema,
    findUnidentifiedDuplicatesQuerySchema,
    claimUnidentifiedExpenseSchema,
} from "$lib/schemas/unidentifiedExpenses";

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
            const { vaultId, page, limit, categoryId, startDate, endDate, memberIds, fundId } = c.req.valid('query');

            const memberIdsArray = memberIds ? memberIds.split(',') : undefined;

            const result = await getExpenses(vaultId, session, c.env, {
                page,
                limit,
                categoryId,
                startDate,
                endDate,
                memberIds: memberIdsArray,
                fundId
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
    // Command: Create multiple expenses in a batch (POST)
    .post(
        '/createExpenses',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Create multiple expenses in a batch',
            responses: {
                201: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.object({
                                    created: v.number(),
                                    expenseIds: v.array(v.string()),
                                })
                            }))
                        },
                    },
                },
            },
        }),
        vValidator('json', createExpensesRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');

            try {
                const result = await createExpenses(session, data, c.env);
                return c.json({
                    success: true,
                    data: result
                }, 201);
            } catch (error) {
                console.error({
                    message: 'Error creating expenses batch',
                    error
                });
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 400;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to create expenses'
                }, status);
            }
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
    // Query: Export all expenses for a vault as CSV (GET, streamed)
    .get(
        '/exportExpenses',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Export expenses to CSV. Streams the response.',
            responses: {
                200: {
                    description: 'CSV file',
                    content: {
                        'text/csv': {},
                    },
                },
            },
        }),
        vValidator('query', exportExpensesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const { stream, fileName } = await exportExpenses(session, query, c.env);
                return new Response(stream, {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/csv; charset=utf-8',
                        'Content-Disposition': `attachment; filename="${fileName}"`,
                        'Cache-Control': 'no-store',
                    },
                });
            } catch (error) {
                console.error({ message: 'Error exporting expenses', error });
                const status = error instanceof Error && error.message.toLowerCase().includes('entitlement') ? 403 : 400;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to export expenses',
                }, status);
            }
        })
    // Command: Preview a CSV import — parse, validate, return normalized rows + errors (POST, multipart)
    .post(
        '/previewImportExpenses',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Preview a CSV import without writing. Multipart body: vaultId + file.',
            responses: {
                200: {
                    description: 'Preview result',
                    content: {
                        'application/json': {
                            schema: resolver(v.any()),
                        },
                    },
                },
            },
        }),
        async (c) => {
            const session = c.get('currentSession');

            let vaultId: string;
            let csvText: string;
            try {
                const form = await c.req.parseBody();
                const rawVaultId = form['vaultId'];
                const file = form['file'];
                if (typeof rawVaultId !== 'string' || !rawVaultId) {
                    return c.json({ success: false, error: 'vaultId is required' }, 400);
                }
                if (!(file instanceof File)) {
                    return c.json({ success: false, error: 'file is required' }, 400);
                }
                vaultId = rawVaultId;
                csvText = await file.text();
            } catch (err) {
                console.error('Failed to parse import multipart body:', err);
                return c.json({ success: false, error: 'Invalid multipart body' }, 400);
            }

            try {
                const result = await previewImportExpenses(session, vaultId, csvText, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                console.error({ message: 'Error previewing CSV import', error });
                const status = error instanceof Error && error.message.toLowerCase().includes('entitlement') ? 403 : 400;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to preview import',
                }, status);
            }
        })
    // Command: Confirm a previewed CSV import — persists rows (POST, JSON)
    .post(
        '/confirmImportExpenses',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Confirm and persist a previewed CSV import.',
            responses: {
                200: {
                    description: 'Import result',
                    content: {
                        'application/json': {
                            schema: resolver(v.any()),
                        },
                    },
                },
            },
        }),
        vValidator('json', confirmImportPayloadSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await confirmImportExpenses(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                console.error({ message: 'Error confirming CSV import', error });
                const status = error instanceof Error && error.message.toLowerCase().includes('entitlement') ? 403 : 400;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to import expenses',
                }, status);
            }
        })
    // Command: Undo an import by soft-deleting all expenses stamped with the importBatchId
    .post(
        '/undoImportExpenses',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Soft-delete all expenses from a previous CSV import.',
            responses: {
                200: {
                    description: 'Undo result',
                    content: {
                        'application/json': {
                            schema: resolver(v.any()),
                        },
                    },
                },
            },
        }),
        vValidator('json', v.object({
            vaultId: v.string(),
            importBatchId: v.string(),
        })),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId, importBatchId } = c.req.valid('json');
            try {
                const result = await undoImportExpenses(session, vaultId, importBatchId, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                console.error({ message: 'Error undoing CSV import', error });
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to undo import',
                }, 400);
            }
        })
    // Query: Recent unidentified expenses + totals (for the dashboard widget)
    .get(
        '/getUnidentifiedExpenses',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Recent unidentified expenses for a vault, plus running totals.',
            responses: {
                200: {
                    description: 'OK',
                    content: { 'application/json': { schema: resolver(v.any()) } },
                },
            },
        }),
        vValidator('query', v.object({
            vaultId: v.string(),
            limit: v.optional(v.pipe(v.string(), v.transform(Number)), '5'),
        })),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId, limit } = c.req.valid('query');
            try {
                const data = await getUnidentifiedExpenses(vaultId, session, c.env, limit);
                return c.json({ success: true, data });
            } catch (error) {
                console.error({ message: 'Error fetching unidentified expenses', error });
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed',
                }, 400);
            }
        },
    )
    // Command: Create an unidentified expense (just amount + date + paidBy)
    .post(
        '/createUnidentifiedExpense',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Quick-log a charge from a bank notification. Just amount + date + paidBy; details are filled in later via claim.',
            responses: {
                201: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.object({ id: v.string() }),
                            })),
                        },
                    },
                },
            },
        }),
        vValidator('json', createUnidentifiedExpenseSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await createUnidentifiedExpense(session, data, c.env);
                return c.json({ success: true, data: result }, 201);
            } catch (error) {
                console.error({ message: 'Error creating unidentified expense', error });
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed',
                }, 400);
            }
        },
    )
    // Query: Find unidentified expenses matching a candidate amount + date
    .get(
        '/findUnidentifiedDuplicates',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Look for unidentified expenses with the same amount within ±1 day of the given date.',
            responses: {
                200: {
                    description: 'Match list (may be empty)',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.array(v.any()),
                            })),
                        },
                    },
                },
            },
        }),
        vValidator('query', findUnidentifiedDuplicatesQuerySchema),
        async (c) => {
            const session = c.get('currentSession');
            const query = c.req.valid('query');
            try {
                const data = await findUnidentifiedDuplicates(session, c.env, query);
                return c.json({ success: true, data });
            } catch (error) {
                console.error({ message: 'Error finding unidentified duplicates', error });
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed',
                }, 400);
            }
        },
    )
    // Command: Claim an unidentified expense — fill in details, flip status to confirmed
    .post(
        '/claimUnidentifiedExpense',
        describeRoute({
            ...commonExpenseConfig,
            description: 'Fill in the missing details of an unidentified expense and mark it confirmed.',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.object({ id: v.string() }),
                            })),
                        },
                    },
                },
            },
        }),
        vValidator('json', claimUnidentifiedExpenseSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await claimUnidentifiedExpense(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                console.error({ message: 'Error claiming unidentified expense', error });
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 400;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed',
                }, status);
            }
        },
    )
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
