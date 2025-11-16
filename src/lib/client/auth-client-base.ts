import {createAuthClient} from "better-auth/client";
import {plugins} from "$lib/better-auth";

export const authClientBase = ({basePath}: {basePath:string}) => createAuthClient({
    baseURL: basePath,
    plugins: plugins,
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60 // Cache duration in seconds
        }
    }
});

export const adminAuthClientBase = ({basePath}: {basePath:string}) => createAuthClient({
    baseURL: basePath,
    plugins: plugins,
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60 // Cache duration in seconds
        }
    }
});