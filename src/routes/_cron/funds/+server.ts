import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processDueFundCycles } from '$lib/server/api/funds/processDueFundCycles';

const CRON_HEADER = 'x-cron-secret';

export const POST: RequestHandler = async ({ request, platform }) => {
    if (!platform) {
        throw error(500, 'Platform unavailable');
    }

    const expected = platform.env.CRON_SECRET;
    if (!expected) {
        throw error(500, 'CRON_SECRET not configured');
    }

    const provided = request.headers.get(CRON_HEADER);
    if (!provided || provided !== expected) {
        throw error(401, 'Invalid cron secret');
    }

    const body = await request.json().catch(() => ({})) as { now?: string; fundId?: string };
    const now = body.now ? new Date(body.now) : undefined;

    const result = await processDueFundCycles(platform.env, {
        now,
        fundId: body.fundId,
    });

    return json({ success: true, data: result });
};
