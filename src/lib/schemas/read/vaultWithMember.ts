export type VaultWithMember = {
    vaults: {
        id: string;
        name: string;
        description: string | null;
        color: string;
        icon: string | null;
        iconType: string | null;
        organizationId: string | null;
        isDefault: boolean;
        createdAt: string | null;
        createdBy: string;
        updatedAt: string | null;
        updatedBy: string | null;
        deletedAt: string | null;
        deletedBy: string | null;
    };
    vaultMembers: {
        id: string;
        vaultId: string;
        userId: string;
        role: string;
        invitedBy: string | null;
        status: string;
        invitedAt: string | null;
        joinedAt: string | null;
        updatedAt: string | null;
        deletedAt: string | null;
    };
    members: Array<{
        userId: string;
        displayName: string;
        role: string;
        joinedAt: string | null;
    }>;
};