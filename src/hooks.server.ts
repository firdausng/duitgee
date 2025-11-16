import {sequence} from "@sveltejs/kit/hooks";
import {
    setupServicesHandler,
} from "$lib/server/hooks";

export const handle = sequence(setupServicesHandler);
