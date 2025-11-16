import {Hono} from 'hono';
import * as v from "valibot";
import {describeRoute, resolver} from "hono-openapi";
import {vValidator} from "@hono/valibot-validator";
import {getVaults} from "$lib/server/api/vaults/getVaultsHandler";
import {createVaultSchema} from "$lib/schemas/vaults";
import {createVault} from "$lib/server/api/vaults/createVaultHandler";
import {getVault} from "$lib/server/api/vaults/getVaultHandler";

const VAULT_TAG = ['Vault'];
const commonVaultConfig = {
    tags: VAULT_TAG,
};


export const vaultsApi = new Hono<App.Api>()
    .get(
        '/',
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
    .post(
        '/',
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
    .get(
        '/:id',
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
        async (c) => {
            const session = c.get('currentSession');
            const vaultId = c.req.param('id');

            try {
                const vault = await getVault(session.user.id, vaultId, c.env);
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
