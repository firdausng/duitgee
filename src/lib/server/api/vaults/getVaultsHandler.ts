import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {vaultMembers, vaults} from "$lib/server/db/schema";
import {and, eq, isNull} from "drizzle-orm";

export const getVaults = async (
    session: App.AuthSession,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    const vaultList = await client
        .select({
            vaults: vaults,
            vaultMembers: vaultMembers
        })
        .from(vaults)
        .innerJoin(vaultMembers, eq(vaults.id, vaultMembers.vaultId))
        .where(and(
            eq(vaultMembers.userId, session.user.id),
            eq(vaultMembers.status, 'active'),
            isNull(vaults.deletedAt)
        ));


    return {
        vaults: vaultList,
    };
};