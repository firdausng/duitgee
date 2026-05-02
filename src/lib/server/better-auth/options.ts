import type {BetterAuthOptions, BetterAuthPlugin} from "better-auth";
import {plugins} from "$lib/better-auth";
import {FREE_PLAN_ID} from "$lib/configurations/plans";

export const betterAuthOptions: BetterAuthOptions = {
    appName: 'DUIT_GEE',
    plugins: plugins,
    user: {
        additionalFields: {
            planId: {
                type: 'string',
                required: false,
                defaultValue: FREE_PLAN_ID,
                input: false,
            },
        },
    },
};

