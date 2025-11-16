import * as v from 'valibot';

export const categoryGroupSchema = v.object({
    name: v.pipe(v.string(), v.minLength(1, 'Name must be 1 or more characters long.')),
    description: v.nullable(v.string()),
    color: v.pipe(v.string(), v.minLength(1, 'Color must be 1 or more characters long.'), v.regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')),
    icon: v.nullable(v.string()),
    iconType: v.nullable(v.string()),
    isPublic: v.boolean(),
});

export type CategoryGroup = v.InferOutput<typeof categoryGroupSchema>;

export const categorySchema = v.object({
    name: v.pipe(v.string(), v.minLength(1, 'name is required')),
    description: v.string(),
    icon: v.string(),
    iconType: v.string(),
    color: v.string(),
    isPublic: v.boolean(),
    group: v.string(),
});

export type Category = v.InferOutput<typeof categorySchema>;