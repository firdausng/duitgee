import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {vaultMembers} from "$lib/server/db/schema";
import {and, eq} from "drizzle-orm";

export type VaultRole = 'owner' | 'admin' | 'member';

export interface VaultPermissions {
    canCreateExpenses: boolean;
    canEditExpenses: boolean;
    canDeleteExpenses: boolean;
    canManageMembers: boolean;
    canEditVault: boolean;
    canDeleteVault: boolean;
    canManageFunds: boolean;
}

export const getUserVaultRole = async (userId: string, vaultId: string, env: Cloudflare.Env): Promise<VaultRole | null> => {
    const client = drizzle(env.DB, { schema });

    // Check vault membership
    const membership = await client
        .select({ role: vaultMembers.role })
        .from(vaultMembers)
        .where(
            and(
                eq(vaultMembers.vaultId, vaultId),
                eq(vaultMembers.userId, userId),
                eq(vaultMembers.status, 'active')
            )
        )
        .limit(1);

    if (membership.length > 0) {
        return membership[0].role as VaultRole;
    }

    return null; // No access
};

// Get detailed permissions based on role
export const getVaultPermissions = (role: VaultRole | null): VaultPermissions => {
    if (!role) {
        // No access
        return {
            canCreateExpenses: false,
            canEditExpenses: false,
            canDeleteExpenses: false,
            canManageMembers: false,
            canEditVault: false,
            canDeleteVault: false,
            canManageFunds: false
        };
    }

    switch (role) {
        case 'owner':
            // Owner can do everything
            return {
                canCreateExpenses: true,
                canEditExpenses: true,
                canDeleteExpenses: true,
                canManageMembers: true,
                canEditVault: true,
                canDeleteVault: true,
                canManageFunds: true
            };

        case 'admin':
            // Admin can do everything except delete vault
            return {
                canCreateExpenses: true,
                canEditExpenses: true,
                canDeleteExpenses: true,
                canManageMembers: true,
                canEditVault: true,
                canDeleteVault: false,
                canManageFunds: true
            };

        case 'member':
            // Member can only create expenses
            return {
                canCreateExpenses: true,
                canEditExpenses: false,
                canDeleteExpenses: false,
                canManageMembers: false,
                canEditVault: false,
                canDeleteVault: false,
                canManageFunds: false
            };

        default:
            return getVaultPermissions(null);
    }
};

// Check if user has specific permission for vault
export const checkVaultPermission = async (
    userId: string,
    vaultId: string,
    permission: keyof VaultPermissions,
    env: Cloudflare.Env
): Promise<boolean> => {
    const role = await getUserVaultRole(userId, vaultId, env);
    const permissions = getVaultPermissions(role);
    return permissions[permission];
};

// Middleware function to enforce permissions
export const requireVaultPermission = async (
    session: App.AuthSession,
    vaultId: string,
    permission: keyof VaultPermissions,
    env: Cloudflare.Env
): Promise<void> => {
    const userId = session.user.id;
    const hasPermission = await checkVaultPermission(userId, vaultId, permission, env);

    if (!hasPermission) {
        const role = await getUserVaultRole(userId, vaultId, env);
        throw new Error(`Permission denied: ${role || 'No access'} role cannot ${permission}`);
    }
};