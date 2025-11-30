import * as v from 'valibot';

export const invitationSchema = v.object({
    id: v.string(),
    vaultId: v.string(),
    role: v.nullable(v.string()),
    status: v.string(), // 'pending' | 'accepted' | 'rejected'
    inviterId: v.nullable(v.string()),
    inviteeId: v.nullable(v.string()),
});

export type Invitation = v.InferOutput<typeof invitationSchema>;

export const createInvitationSchema = v.object({
    vaultId: v.pipe(v.string(), v.minLength(1, 'Vault ID is required')),
    inviteeEmail: v.pipe(v.string(), v.minLength(1, 'Invitee ID is required')),
    role: v.picklist(['admin', 'member'], 'Role must be either admin or member'),
});

export type CreateInvitation = v.InferOutput<typeof createInvitationSchema>;

export const acceptInvitationSchema = v.object({
    invitationId: v.pipe(v.string(), v.minLength(1, 'Invitation ID is required')),
});

export type AcceptInvitation = v.InferOutput<typeof acceptInvitationSchema>;
