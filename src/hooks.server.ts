import {sequence} from "@sveltejs/kit/hooks";
import {
    setupServicesHandler,checkSessionHandler
} from "$lib/server/hooks";

export const handle = sequence(setupServicesHandler, checkSessionHandler);
