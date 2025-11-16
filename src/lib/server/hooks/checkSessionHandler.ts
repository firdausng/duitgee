import {type Handle, redirect} from "@sveltejs/kit";
import {authConfig} from "$lib/server/better-auth";

const publicRoutes = [
    '/login',
    '/register',
    '/logged-out',
    '/forgot-password',
    '/reset-password',
    '/callback',
    '/unauthorized',
    '/privacy',
    '/term',
    '/.well-known',
    '/openapi.json',
    '/scalar',
    '/api'
]


export const checkSessionHandler: Handle = async ({ event, resolve }) => {
    if(event.platform === undefined){
        throw new Error("No Platform")
    }
    const pathname = event.url.pathname;
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return resolve(event);
    }

    const betterAuth = authConfig(event.platform.env);

    if(!event.locals.currentSession){
        console.warn({message: `[checkSessionHandler] user not authenticated, cannot access ${pathname}, register this to public route if this meant to be public`});
        return redirect(307, "/login");
    }

    if(event.locals.currentSession.session.activeOrganizationId){
        return resolve(event);
    }

    const organizations = await betterAuth.api.listOrganizations({
        // This endpoint requires session cookies.
        headers: event.request.headers,
    });

    let activeOrgId: string;
    if(organizations.length === 0){
        const name = event.locals.currentSession.user.email.split("@")[0];
        const firstOrganization = await betterAuth.api.createOrganization({
            body: {
                name: name, // required
                slug: name, // required
                // logo: "https://example.com/logo.png",
                // metadata,
                userId: event.locals.currentSession.user.id, // server-only
                keepCurrentActiveOrganization: false,
            },
            // This endpoint requires session cookies.
            headers:  event.request.headers,
        });
        activeOrgId = firstOrganization!.id;
        console.log({
            message: 'finish creating organization for user'
        })
    }else{
        activeOrgId = organizations[0].id;
    }

    const data = await betterAuth.api.setActiveOrganization({
        body: {
            organizationId: activeOrgId,
        },
    });


    return resolve(event);
};
