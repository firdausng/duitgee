import {Hono} from 'hono';
import * as v from "valibot";
import {describeRoute, resolver} from "hono-openapi";
import {vValidator} from "@hono/valibot-validator";
import {getVaults} from "$lib/server/api/vaults/getVaultsHandler";
import {
    createVaultSchema,
    getVaultRequestSchema,
    listVaultsRequestSchema,
    updateVaultRequestSchema,
    deleteVaultRequestSchema,
    setDefaultVaultRequestSchema
} from "$lib/schemas/vaults";
import {createVault} from "$lib/server/api/vaults/createVaultHandler";
import {getVault} from "$lib/server/api/vaults/getVaultHandler";
import {updateVault} from "$lib/server/api/vaults/updateVaultHandler";
import {deleteVault} from "$lib/server/api/vaults/deleteVaultHandler";
import {setDefaultVault} from "$lib/server/api/vaults/setDefaultVaultHandler";
import {getVaultStatistics} from "$lib/server/api/vaults/getVaultStatisticsHandler";

const VAULT_TAG = ['Vault'];
const commonVaultConfig = {
    tags: VAULT_TAG,
};

export const vaultsApi = new Hono<App.Api>()
    // Query: Get user's vaults (GET)
    .get(
        '/getVaults',
        describeRoute({
            ...commonVaultConfig,
            description: 'Get user\'s vaults',
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
            },
        }),
        async (c) => {
            const session = c.get('currentSession') as App.AuthSession;

            try {
                const data = await getVaults(session, c.env);
                return c.json({
                    success: true,
                    data: data.vaults
                });
            } catch (error) {
                console.error({
                    message: 'Error fetching vaults:',
                    error
                });
                return c.json({
                    success: false,
                    error: 'Failed to fetch vaults'
                }, 500);
            }
        })
    // Command: Create vault (POST)
    .post(
        '/createVault',
        describeRoute({
            ...commonVaultConfig,
            description: 'Create a new vault',
            responses: {
                201: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(createVaultSchema)
                        },
                    },
                },
            },
        }),
        vValidator('json', createVaultSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');

            try {
                const vault = await createVault(session, data, c.env);
                if(vault.error){
                    return c.json({
                        success: false,
                        error: vault.error
                    }, 400);
                }
                return c.json({
                    success: true,
                    data: vault
                }, 201);
            } catch (error) {
                console.error({
                    message: 'Error creating vault',
                    error
                });
                return c.json({
                    success: false,
                    error: 'Failed to create vault'
                }, 500);
            }
        })
    // Query: Get vault by id (GET)
    .get(
        '/getVault',
        describeRoute({
            ...commonVaultConfig,
            description: 'Get specific vault with members',
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
                    description: 'Vault not found',
                },
            },
        }),
        vValidator('query', getVaultRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId } = c.req.valid('query');

            try {
                const vault = await getVault(session, vaultId, c.env);

                return c.json({
                    success: true,
                    data: vault
                });
            } catch (error) {
                console.error({
                    message: `Error fetching vault`,
                    error
                })
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch vault'
                }, status);
            }
        })
    // Command: Update vault (POST)
    .post(
        '/updateVault',
        describeRoute({
            ...commonVaultConfig,
            description: 'Update an existing vault',
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
                    description: 'Vault not found',
                },
            },
        }),
        vValidator('json', updateVaultRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');

            try {
                const vault = await updateVault(session, data, c.env);
                return c.json({
                    success: true,
                    data: vault
                });
            } catch (error) {
                console.error({
                    message: 'Error updating vault',
                    error
                });
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update vault'
                }, status);
            }
        })
    // Command: Delete vault (POST)
    .post(
        '/deleteVault',
        describeRoute({
            ...commonVaultConfig,
            description: 'Soft delete a vault',
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
                    description: 'Vault not found',
                },
            },
        }),
        vValidator('json', deleteVaultRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');

            try {
                const vault = await deleteVault(session, data, c.env);
                return c.json({
                    success: true,
                    data: vault
                });
            } catch (error) {
                console.error({
                    message: 'Error deleting vault',
                    error
                });
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to delete vault'
                }, status);
            }
        })
    // Command: Set default vault (POST)
    .post(
        '/setDefaultVault',
        describeRoute({
            ...commonVaultConfig,
            description: 'Set a vault as default for the current user',
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
                    description: 'Vault not found or user is not a member',
                },
            },
        }),
        vValidator('json', setDefaultVaultRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId } = c.req.valid('json');

            try {
                const result = await setDefaultVault(vaultId, session, c.env);
                return c.json({
                    success: true,
                    data: result
                });
            } catch (error) {
                console.error({
                    message: 'Error setting default vault',
                    error
                });
                const status = error instanceof Error && error.message.includes('not a member') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to set default vault'
                }, status);
            }
        })
    // Query: Get vault statistics (GET)
    .get(
        '/getVaultStatistics',
        describeRoute({
            ...commonVaultConfig,
            description: 'Get statistics for a specific vault',
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
                    description: 'Vault not found',
                },
            },
        }),
        vValidator('query', v.object({
            vaultId: v.string(),
            startDate: v.optional(v.string()),
            endDate: v.optional(v.string()),
        })),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId, startDate, endDate } = c.req.valid('query');

            try {
                const stats = await getVaultStatistics(vaultId, session, c.env, {
                    startDate,
                    endDate
                });
                return c.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                console.error({
                    message: 'Error fetching vault statistics',
                    error
                });
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch vault statistics'
                }, status);
            }
        })
