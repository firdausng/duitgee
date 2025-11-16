import { drizzle } from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import {vaults} from "$lib/server/db/schema";
import {eq} from "drizzle-orm";

export const getVaults = async (
    session: App.AuthSession,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    // Get vault details
    const vaultList = await client
        .select()
        .from(vaults)
        .where(eq(vaults.organizationId, session.session.activeOrganizationId));

    return {
        vaults: vaultList,
    };
};
