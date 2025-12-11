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
    if (pathname === '/' || publicRoutes.some(route => pathname.startsWith(route))) {
        return resolve(event);
    }

    if(!event.locals.currentSession){
        console.warn({message: `[checkSessionHandler] user not authenticated, cannot access ${pathname}, register this to public route if this meant to be public`});
        return redirect(307, "/login");
    }

    return resolve(event);
};
