import { createAuthClient } from 'better-auth/client';
import { adminClient, anonymousClient, organizationClient } from 'better-auth/client/plugins';

const clientPlugins = [adminClient(), anonymousClient(), organizationClient()];

export const authClientBase = ({ basePath }: { basePath: string }) =>
    createAuthClient({
        baseURL: basePath,
        plugins: clientPlugins,
        session: {
            cookieCache: {
                enabled: true,
                maxAge: 5 * 60, // Cache duration in seconds
            },
        },
    });

export const adminAuthClientBase = ({ basePath }: { basePath: string }) =>
    createAuthClient({
        baseURL: basePath,
        plugins: clientPlugins,
        session: {
            cookieCache: {
                enabled: true,
                maxAge: 5 * 60,
            },
        },
    });
