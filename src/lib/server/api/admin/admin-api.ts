import { Hono } from 'hono';
import * as v from 'valibot';
import { describeRoute } from 'hono-openapi';
import { vValidator } from '@hono/valibot-validator';
import { isAdmin } from '$lib/server/utils/adminCheck';
import { processDueFundCycles } from '$lib/server/api/funds/processDueFundCycles';

const OPS_TAG = ['Ops'];

const runFundsCronSchema = v.object({
    now: v.optional(v.string()),
    fundId: v.optional(v.string()),
});

export const adminApi = new Hono<App.Api>()
    .post(
        '/ops/cron/funds',
        describeRoute({
            hide: true,
            tags: OPS_TAG,
            description:
                'Manually trigger the fund-cycle rollover + auto-replenishment job. Admin-gated (user.role === "admin"). Accepts optional ISO `now` and `fundId` to scope the run.',
        }),
        vValidator('json', runFundsCronSchema),
        async (c) => {
            const session = c.get('currentSession');
            if (!session?.user || !isAdmin(session.user)) {
                return c.json({ success: false, error: 'Not found' }, 404);
            }

            const { now, fundId } = c.req.valid('json');
            try {
                const result = await processDueFundCycles(c.env, {
                    now: now ? new Date(now) : undefined,
                    fundId,
                });
                return c.json({ success: true, data: result });
            } catch (error) {
                return c.json(
                    {
                        success: false,
                        error: error instanceof Error ? error.message : 'Cron job failed',
                    },
                    500,
                );
            }
        },
    );
