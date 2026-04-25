import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { purgeOldInsights } from '$lib/server/api/statistics/getStatisticsInsightsHandler';

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

    const result = await purgeOldInsights(platform.env);
    return json({ success: true, data: result });
};
