import type {Handle} from "@sveltejs/kit";
import {authConfig} from "$lib/server/better-auth";

export const setupServicesHandler: Handle = async ({ event, resolve }) => {
    if(event.platform === undefined){
        throw new Error("No Platform")
    }

    const db = event.platform.env.DB;
    if(db === undefined){
        throw new Error("Database not defined");
    }

    const betterAuth = authConfig(event.platform.env);

    const session = await betterAuth.api.getSession({
        headers: event.request.headers,
    });

    if(session){
        // console.log({message: "[setupServicesHandler] setting user session"});
        event.locals.currentSession = session;
        event.locals.currentUser = session.user;
    }

    return resolve(event);
};