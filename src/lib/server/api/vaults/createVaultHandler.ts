import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {createId} from "@paralleldrive/cuid2";
import type {CreateVault} from "$lib/schemas/vaults";
import {vaultMembers, vaults} from "$lib/server/db/schema";
import {formatISO} from "date-fns";
import {UTCDate} from "@date-fns/utc";
import {initialAuditFields} from "$lib/server/utils/audit";
import {eq, and} from "drizzle-orm";

export const createVault = async (
    session: App.AuthSession,
    data: CreateVault,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    const existingVaults = await client
    .select()
    .from(vaults)
    .where(eq(vaults.createdBy, session.user.id));

    if(existingVaults.length >= env.VAULT_LIMIT){
        return {
            vault: null,
            member: null,
            error: "Vault limit reached"
        }
    }

    // Check if user has any existing active vault memberships
    const existingMemberships = await client
        .select()
        .from(vaultMembers)
        .where(
            and(
                eq(vaultMembers.userId, session.user.id),
                eq(vaultMembers.status, 'active')
            )
        )
        .limit(1);

    // Set as default if this is the user's first active vault membership
    const isFirstVault = existingMemberships.length === 0;

    const vaultData = {
        id: createId(),
        ...data,
    };

    const [newVault] = await client
        .insert(vaults)
        .values({
            ...vaultData,
            ...initialAuditFields({ userId: session.user.id })
        })
        .returning();

    const newMember = await client
        .insert(vaultMembers)
        .values({
            vaultId: newVault.id,
            userId: session.user.id,
            displayName: session.user.name || session.user.email,
            role: 'owner',
            invitedBy: session.user.id,
            status: 'active',
            isDefault: isFirstVault,
            joinedAt: formatISO(new UTCDate()),
        })
        .returning();

    return {
        vault: newVault,
        member: newMember,
        error: null
    };
}