import * as v from 'valibot';

export const vaultSchema = v.object({
    id: v.string(), // cuid-like id
    name: v.string(), // notNull
    description: v.nullable(v.string()), // nullable
    color: v.string(), // default "#3B82F6"
    icon: v.nullable(v.string()), // default "🏦"
    iconType: v.nullable(v.picklist(["emoji", "phosphor"])), // DB default 'emoji'
    teamId: v.nullable(v.string()),
    organizationId: v.nullable(v.string()),
    isDefault: v.boolean(),
    // Localization settings
    locale: v.string(), // BCP 47 language tag, default "en-US"
    currency: v.nullable(v.string()), // ISO 4217 currency code, default "USD"
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

// RPC-style request schemas
export const getVaultRequestSchema = v.object({
    vaultId: v.string(),
});
export type GetVaultRequest = v.InferOutput<typeof getVaultRequestSchema>;

export const listVaultsRequestSchema = v.optional(v.object({
    // Future: add filtering options here if needed
}));
export type ListVaultsRequest = v.InferOutput<typeof listVaultsRequestSchema>;

export const updateVaultRequestSchema = v.object({
    id: v.string(),
    ...v.partial(v.pick(createVaultSchema, ['name', 'description', 'color', 'icon', 'iconType', "isDefault", "locale", "currency"])).entries
});
export type UpdateVaultRequest = v.InferOutput<typeof updateVaultRequestSchema>;

export const deleteVaultRequestSchema = v.object({
    id: v.string(),
});
export type DeleteVaultRequest = v.InferOutput<typeof deleteVaultRequestSchema>;

export const setDefaultVaultRequestSchema = v.object({
    vaultId: v.string(),
});
export type SetDefaultVaultRequest = v.InferOutput<typeof setDefaultVaultRequestSchema>;

// Member management schemas
export const removeMemberRequestSchema = v.object({
    vaultId: v.string(),
    userId: v.string(),
});
export type RemoveMemberRequest = v.InferOutput<typeof removeMemberRequestSchema>;

export const updateMemberRoleRequestSchema = v.object({
    vaultId: v.string(),
    userId: v.string(),
    role: v.picklist(['admin', 'member']),
});
export type UpdateMemberRoleRequest = v.InferOutput<typeof updateMemberRoleRequestSchema>;

export const leaveVaultRequestSchema = v.object({
    vaultId: v.string(),
});
export type LeaveVaultRequest = v.InferOutput<typeof leaveVaultRequestSchema>;