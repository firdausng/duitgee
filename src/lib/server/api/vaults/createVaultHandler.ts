import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {createId} from "@paralleldrive/cuid2";
import type {CreateVault} from "$lib/schemas/vaults";
import {authConfig} from "$lib/server/better-auth";
import {vaultMembers, vaults} from "$lib/server/db/schema";
import {formatISO} from "date-fns";
import {UTCDate} from "@date-fns/utc";
import {initialAuditFields} from "$lib/server/utils/audit";

export const createVault = async (
    session: App.AuthSession,
    data: CreateVault,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });
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
            joinedAt: formatISO(new UTCDate()),
        })
        .returning();

    return {
        vault: newVault,
        member: newMember,
    };
}