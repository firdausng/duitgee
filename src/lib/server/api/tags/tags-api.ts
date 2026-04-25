import { Hono } from 'hono';
import * as v from 'valibot';
import { describeRoute, resolver } from 'hono-openapi';
import { vValidator } from '@hono/valibot-validator';
import {
    getTagsRequestSchema,
    createTagRequestSchema,
    updateTagRequestSchema,
    deleteTagRequestSchema,
    setExpenseTagsRequestSchema,
} from '$lib/schemas/tags';
import { getTags } from '$lib/server/api/tags/getTagsHandler';
import { createTag } from '$lib/server/api/tags/createTagHandler';
import { updateTag } from '$lib/server/api/tags/updateTagHandler';
import { deleteTag } from '$lib/server/api/tags/deleteTagHandler';
import { setExpenseTags } from '$lib/server/api/tags/setExpenseTagsHandler';

const TAG = ['Tag'];
const common = { tags: TAG };

const successResponse = {
    200: {
        description: 'Successful response',
        content: {
            'application/json': {
                schema: resolver(v.object({ success: v.boolean(), data: v.any() })),
            },
        },
    },
};

const createdResponse = {
    201: {
        description: 'Successful response',
        content: {
            'application/json': {
                schema: resolver(v.object({ success: v.boolean(), data: v.any() })),
            },
        },
    },
};

export const tagsApi = new Hono<App.Api>()
    .get(
        '/getTags',
        describeRoute({
            ...common,
            description: 'Get all tags for a vault',
            responses: successResponse,
        }),
        vValidator('query', getTagsRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const { vaultId } = c.req.valid('query');
            try {
                const tags = await getTags(session, vaultId, c.env);
                return c.json({ success: true, data: tags });
            } catch (error) {
                console.error({ message: 'Error fetching tags', error });
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch tags',
                }, 400);
            }
        },
    )
    .post(
        '/createTag',
        describeRoute({
            ...common,
            description: 'Create a tag in a vault',
            responses: createdResponse,
        }),
        vValidator('json', createTagRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const tag = await createTag(session, data, c.env);
                return c.json({ success: true, data: tag }, 201);
            } catch (error) {
                console.error({ message: 'Error creating tag', error });
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to create tag',
                }, 400);
            }
        },
    )
    .post(
        '/updateTag',
        describeRoute({
            ...common,
            description: 'Update a tag',
            responses: successResponse,
        }),
        vValidator('json', updateTagRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const tag = await updateTag(session, data, c.env);
                return c.json({ success: true, data: tag });
            } catch (error) {
                console.error({ message: 'Error updating tag', error });
                const status = error instanceof Error && error.message.toLowerCase().includes('not found') ? 404 : 400;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update tag',
                }, status);
            }
        },
    )
    .post(
        '/deleteTag',
        describeRoute({
            ...common,
            description: 'Soft-delete a tag and remove all its assignments',
            responses: successResponse,
        }),
        vValidator('json', deleteTagRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await deleteTag(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                console.error({ message: 'Error deleting tag', error });
                const status = error instanceof Error && error.message.toLowerCase().includes('not found') ? 404 : 400;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to delete tag',
                }, status);
            }
        },
    )
    .post(
        '/setExpenseTags',
        describeRoute({
            ...common,
            description: 'Replace the full set of tags on a single expense',
            responses: successResponse,
        }),
        vValidator('json', setExpenseTagsRequestSchema),
        async (c) => {
            const session = c.get('currentSession');
            const data = c.req.valid('json');
            try {
                const result = await setExpenseTags(session, data, c.env);
                return c.json({ success: true, data: result });
            } catch (error) {
                console.error({ message: 'Error setting expense tags', error });
                const status = error instanceof Error && error.message.toLowerCase().includes('not found') ? 404 : 400;
                return c.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to set expense tags',
                }, status);
            }
        },
    );
