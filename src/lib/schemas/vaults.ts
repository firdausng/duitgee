import * as v from 'valibot';

export const vaultSchema = v.object({
    id: v.string(), // cuid-like id
    name: v.string(), // notNull
    description: v.nullable(v.string()), // nullable
    color: v.string(), // default "#3B82F6"
    icon: v.nullable(v.string()), // default "🏦"
    iconType: v.nullable(v.picklist(["emoji", "phosphor"])), // DB default 'emoji'
    isPublic: v.boolean(), // boolean, notNull, default true
    teamId: v.nullable(v.string()),
    organizationId: v.nullable(v.string()),
    // Audit fields
    createdAt: v.string(),
    createdBy: v.string(),
    updatedAt: v.string(),
    updatedBy: v.nullable(v.string()),
    deletedAt: v.nullable(v.string()),
    deletedBy: v.nullable(v.string()),
});

export type Vault = v.InferOutput<typeof vaultSchema>;
export const createVaultSchema = v.object({
    ...v.omit(vaultSchema, ["createdAt", "createdBy", "id", "updatedAt", "updatedBy", "deletedAt", "deletedBy"]).entries
})

export type CreateVault = v.InferOutput<typeof createVaultSchema>;
export const updateVaultSchema = v.partial(createVaultSchema);

export type UpdateVault = v.InferOutput<typeof updateVaultSchema>;