import * as v from 'valibot';

export const tagSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    name: v.string(),
    color: v.nullable(v.string()),
    isSystem: v.boolean(),
    // Audit fields
    createdAt: v.nullable(v.string()),
    createdBy: v.string(),
    updatedAt: v.nullable(v.string()),
    updatedBy: v.nullable(v.string()),
    deletedAt: v.nullable(v.string()),
    deletedBy: v.nullable(v.string()),
});
export type Tag = v.InferOutput<typeof tagSchema>;

const tagNameSchema = v.pipe(
    v.string('Tag name is required'),
    v.trim(),
    v.minLength(1, 'Tag name is required'),
    v.maxLength(40, 'Tag name must be 40 characters or less'),
);

const tagColorSchema = v.pipe(
    v.string(),
    v.regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
);

// RPC request schemas
export const getTagsRequestSchema = v.object({
    vaultId: v.string(),
});
export type GetTagsRequest = v.InferOutput<typeof getTagsRequestSchema>;

export const createTagRequestSchema = v.object({
    vaultId: v.string(),
    name: tagNameSchema,
    color: v.optional(v.nullable(tagColorSchema)),
});
export type CreateTagRequest = v.InferOutput<typeof createTagRequestSchema>;

export const updateTagRequestSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    name: v.optional(tagNameSchema),
    color: v.optional(v.nullable(tagColorSchema)),
});
export type UpdateTagRequest = v.InferOutput<typeof updateTagRequestSchema>;

export const deleteTagRequestSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
});
export type DeleteTagRequest = v.InferOutput<typeof deleteTagRequestSchema>;

export const setExpenseTagsRequestSchema = v.object({
    vaultId: v.string(),
    expenseId: v.string(),
    tagIds: v.array(v.string()),
});
export type SetExpenseTagsRequest = v.InferOutput<typeof setExpenseTagsRequestSchema>;
