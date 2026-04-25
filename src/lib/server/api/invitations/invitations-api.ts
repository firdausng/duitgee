import {Hono} from 'hono';
import * as v from "valibot";
import {describeRoute, resolver} from "hono-openapi";
import {vValidator} from "@hono/valibot-validator";
import {createInvitationSchema, acceptInvitationSchema, declineInvitationSchema, revokeInvitationRequestSchema} from "$lib/schemas/invitations";
import {inviteUserToVault} from "$lib/server/api/invitations/inviteUserToVaultHandler";
import {acceptVaultInvitation} from "$lib/server/api/invitations/AcceptInvitationToVaultHandler";
import {getPendingInvitations} from "$lib/server/api/invitations/getPendingInvitationsHandler";
import {getSentInvitations} from "$lib/server/api/invitations/getSentInvitationsHandler";
import {getVaultPendingInvitations} from "$lib/server/api/invitations/getVaultPendingInvitationsHandler";
import {declineVaultInvitation} from "$lib/server/api/invitations/declineInvitationHandler";
import {revokeInvitation} from "$lib/server/api/invitations/revokeInvitationHandler";

const INVITATION_TAG = ['Invitation'];
const commonInvitationConfig = {
    tags: INVITATION_TAG,
};

export const invitationsApi = new Hono<App.Api>()
    // Query: Get pending invitations (GET)
    .get(
        '/getPendingInvitations',
        describeRoute({
            ...commonInvitationConfig,
            description: 'Get all pending invitations for current user',
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
            const session = c.get('currentSession');

            try {
                const invitations = await getPendingInvitations(session, c.env);
                return c.json({
                    success: true,
                    data: invitations
                });
            } catch (error) {
                console.error({
                    message: 'Error fetching pending invitations',
                    error
                });
                return c.json({
                    success: false,
                    error: 'Failed to fetch pending invitations'
                }, 500);
            }
        })
    // Query: Get sent invitations (GET)
    .get(
        '/getSentInvitations',
        describeRoute({
            ...commonInvitationConfig,
            description: 'Get all invitations sent by current user',
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
            const session = c.get('currentSession');

            try {
                const invitations = await getSentInvitations(session, c.env);
                return c.json({
                    success: true,
                    data: invitations
                });
            } catch (error) {
                console.error({
                    message: 'Error fetching sent invitations',
                    error
                });
                return c.json({
                    success: false,
                    error: 'Failed to fetch sent invitations'
                }, 500);
            }
        })
    // Query: Get pending invitations for a single vault (GET)
    .get(
        '/getVaultPendingInvitations',
        describeRoute({
            ...commonInvitationConfig,
            description: 'Get pending invitations for a specific vault, hydrated with invitee email/name',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({ success: v.boolean(), data: v.array(v.any()) }))
                        },
                    },
                },
            },
        }),
        vValidator('query', v.object({ vaultId: v.pipe(v.string(), v.minLength(1)) })),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId } = c.req.valid('query');
            try {
                const invitations = await getVaultPendingInvitations(session, vaultId, c.env);
                return c.json({ success: true, data: invitations });
            } catch (error) {
                console.error({ message: 'Error fetching vault pending invitations', error });
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch pending invitations',
                }, 400);
            }
        })
    // Command: Revoke a pending invitation (POST)
    .post(
        '/revokeInvitation',
        describeRoute({
            ...commonInvitationConfig,
            description: 'Cancel a pending invitation. Sets status=revoked and removes the pending member row.',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({ success: v.boolean(), data: v.any() }))
                        },
                    },
                },
            },
        }),
        vValidator('json', revokeInvitationRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await revokeInvitation(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                console.error({ message: 'Error revoking invitation', error });
                const status = error instanceof Error && error.message.toLowerCase().includes('not found') ? 404 : 400;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to revoke invitation',
                }, status);
            }
        })
    // Command: Create invitation (POST)
    .post(
        '/createInvitation',
        describeRoute({
            ...commonInvitationConfig,
            description: 'Invite a user to a vault',
            responses: {
                201: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.object({
                                    invitation: v.any(),
                                    member: v.any()
                                })
                            }))
                        },
                    },
                },
            },
        }),
        vValidator('json', createInvitationSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');

            try {
                const result = await inviteUserToVault(
                    data.vaultId,
                    data.inviteeEmail,
                    data.role,
                    session,
                    c.env
                );
                return c.json({
                    success: true,
                    data: result
                }, 201);
            } catch (error) {
                console.error({
                    message: 'Error creating invitation',
                    error
                });
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to create invitation'
                }, 500);
            }
        })
    // Command: Accept invitation (POST)
    .post(
        '/acceptInvitation',
        describeRoute({
            ...commonInvitationConfig,
            description: 'Accept a vault invitation',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.object({
                                    member: v.any(),
                                    invitation: v.any()
                                })
                            }))
                        },
                    },
                },
                404: {
                    description: 'Invitation not found',
                },
            },
        }),
        vValidator('json', acceptInvitationSchema),
        async (c) => {
            const session = c.get('currentSession');
            const { invitationId } = c.req.valid('json');

            try {
                const result = await acceptVaultInvitation(
                    invitationId,
                    session,
                    c.env
                );

                return c.json({
                    success: true,
                    data: result
                });
            } catch (error) {
                console.error({
                    message: `Error accepting invitation`,
                    error
                })
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to accept invitation'
                }, status);
            }
        })
    // Command: Decline invitation (POST)
    .post(
        '/declineInvitation',
        describeRoute({
            ...commonInvitationConfig,
            description: 'Decline a vault invitation',
            responses: {
                200: {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: resolver(v.object({
                                success: v.boolean(),
                                data: v.object({
                                    invitation: v.any()
                                })
                            }))
                        },
                    },
                },
                404: {
                    description: 'Invitation not found',
                },
            },
        }),
        vValidator('json', declineInvitationSchema),
        async (c) => {
            const session = c.get('currentSession');
            const { invitationId } = c.req.valid('json');

            try {
                const result = await declineVaultInvitation(
                    invitationId,
                    session,
                    c.env
                );

                return c.json({
                    success: true,
                    data: result
                });
            } catch (error) {
                console.error({
                    message: `Error declining invitation`,
                    error
                })
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to decline invitation'
                }, status);
            }
        })
