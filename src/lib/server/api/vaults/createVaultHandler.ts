import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {createId} from "@paralleldrive/cuid2";
import type {CreateVault} from "$lib/schemas/vaults";
import {expenseTags, vaultMembers, vaults} from "$lib/server/db/schema";
import {formatISO} from "date-fns";
import {UTCDate} from "@date-fns/utc";
import {initialAuditFields} from "$lib/server/utils/audit";
import {eq, and} from "drizzle-orm";
import {DEFAULT_VAULT_TAGS} from "$lib/configurations/defaultTags";

export const createVault = async (
    session: App.AuthSession,
    data: CreateVault,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    if(session.user.role !== 'admin'){
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

    // Seed the WHO/WHY starter tag set. Marked isSystem=true but renameable/deletable.
    if (DEFAULT_VAULT_TAGS.length > 0) {
        await client
            .insert(expenseTags)
            .values(
                DEFAULT_VAULT_TAGS.map((t) => ({
                    vaultId: newVault.id,
                    name: t.name,
                    color: t.color,
                    isSystem: true,
                    ...initialAuditFields({ userId: session.user.id }),
                })),
            );
    }

    return {
        vault: newVault,
        member: newMember,
        error: null
    };
}