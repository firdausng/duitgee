import {Hono} from "hono";
import {trimTrailingSlash,} from 'hono/trailing-slash';
import {logger} from 'hono/logger';
import {prettyJSON} from 'hono/pretty-json';
import {Scalar} from "@scalar/hono-api-reference";
import {openAPIRouteHandler} from "hono-openapi";
import {authConfig} from "$lib/server/better-auth";
import {expensesApi} from "$lib/server/api/expenses/expenses-api";
import {vaultsApi} from "$lib/server/api/vaults/vaults-api";
import {invitationsApi} from "$lib/server/api/invitations/invitations-api";
import {expenseTemplatesApi} from "$lib/server/api/expense-templates/expense-templates-api";
import {budgetsApi} from "$lib/server/api/budgets/budgets-api";
import {userApi} from "$lib/server/api/user/user-api";

const router = new Hono<App.Api>()
    .use('*', trimTrailingSlash())
    .use(logger())
    .use('*', prettyJSON())
    .on(["POST", "GET"], "/auth/*", (c) => authConfig(c.env).handler(c.req.raw))
    .use("*", async (c, next) => {
        const session = await authConfig(c.env).api.getSession({headers: c.req.raw.headers});
        if (!session) {
            return c.body(null, 401);
        }
        c.set("currentSession", session);
        // console.log({
        //     message: `[Set Session] ${session}`,
        //     session
        // })
        return next();
    })
    // RPC-style routes
    .route('/', vaultsApi)
    .route('/', expensesApi)
    .route('/', expenseTemplatesApi)
    .route('/', budgetsApi)
    .route('/', invitationsApi)
    .route('/', userApi)
    // .route('/user-team', teamVaultsApi)
    // .route('/', categoriesApi)
    // .route('/', categoryGroupsApi)
    // .route('/notifications', notificationApi)
    // .route('/admin/vaults', adminVaultsApi)
    // .route('/admin/organizations', adminOrganizationApi)
    // .route('/vault-members', vaultMembersApi)

export const api = new Hono<App.Api>().route('/api', router);

api.get(
    '/openapi.json',
    openAPIRouteHandler(router, {
        documentation: {
            info: {
                title: 'DuitGee API',
                version: '1.0.0',
                description: 'DuitGee API',
            },
            servers: [
                {url: 'http://localhost:5173/api', description: 'Local Server'},
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                    },
                },
            },
            security: [
                {
                    bearerAuth: [],
                },
            ],
        },
    })
);

api.get(
    '/scalar',
    Scalar({
        url: '/openapi.json',
        theme: 'purple',
        pageTitle: 'DuitGee API',
    })
)


async function hashSHA256(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}