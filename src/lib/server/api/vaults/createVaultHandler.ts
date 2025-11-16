import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {createId} from "@paralleldrive/cuid2";
import type {CreateVault} from "$lib/schemas/vaults";
import {authConfig} from "$lib/server/better-auth";
import {vaults} from "$lib/server/db/schema";
import {formatISO} from "date-fns";
import {UTCDate} from "@date-fns/utc";

export const createVault = async (
    session: App.AuthSession,
    data: CreateVault,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });
    const authServer = authConfig(env);

    const vaultData = {
        id: createId(),
        ...data,
    };

    const team = await authServer.api.createTeam({
        body: {
            name: data.name, // required
            organizationId: session.session.activeOrganizationId,
        },
    });
    vaultData.teamId = team.id;
    vaultData.organizationId = session.session.activeOrganizationId;

    const vault = await client
        .insert(vaults)
        .values({
            ...vaultData,
            createdBy: session.user.id,
            createdAt: formatISO(new UTCDate()),
            updatedAt: formatISO(new UTCDate())
        })
        .returning();

    return vault[0];
};