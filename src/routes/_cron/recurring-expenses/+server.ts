import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processDueRecurringExpenses } from '$lib/server/api/recurring-expenses/processDueRecurringExpenses';

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

    const body = (await request.json().catch(() => ({}))) as {
        now?: string;
        vaultId?: string;
        ruleId?: string;
    };
    const now = body.now ? new Date(body.now) : undefined;

    const result = await processDueRecurringExpenses(platform.env, {
        now,
        vaultId: body.vaultId,
        ruleId: body.ruleId,
    });

    return json({ success: true, data: result });
};
