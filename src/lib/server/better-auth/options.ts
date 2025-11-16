import type {BetterAuthOptions, BetterAuthPlugin} from "better-auth";
import {admin, anonymous, bearer, organization, type UserWithRole} from "better-auth/plugins";
import {plugins} from "$lib/better-auth";


/**
 * Better Auth Options
 * this is used in both prod and database migration
 * do not put value related to env here
 */
export const betterAuthOptions: BetterAuthOptions = {
    appName: 'DUIT_GEE',
    plugins: plugins,
};

