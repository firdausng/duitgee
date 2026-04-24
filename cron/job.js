/**
 * Cloudflare scheduled handler appended to .svelte-kit/cloudflare/_worker.js
 * after vite build (see cron/append.js).
 *
 * Routes the cron tick through SvelteKit so the real handler can use Drizzle,
 * path aliases, and the rest of the app. The origin on the Request is a
 * placeholder — Cloudflare never actually issues an HTTP call.
 *
 * @param {import("@cloudflare/workers-types").ScheduledEvent} event
 * @param {Env} env
 * @param {import('@cloudflare/workers-types').EventContext<Env, "", {}>} ctx
 */
worker_default.scheduled = async (event, env, ctx) => {
    console.log('[CRON] tick', event.cron, 'at', new Date().toISOString());

    if (!env.CRON_SECRET) {
        console.error('[CRON] CRON_SECRET not configured; aborting');
        return;
    }

    const origin = env.BASE_PATH || 'https://duitgee.com';

    try {
        const req = new Request(`${origin}/_cron/funds`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-cron-secret': env.CRON_SECRET,
            },
            body: JSON.stringify({}),
        });
        const res = await worker_default.fetch(req, env, ctx);
        const body = await res.text();
        if (!res.ok) {
            console.error('[CRON] funds job failed', res.status, body);
        } else {
            console.log('[CRON] funds job ok', body);
        }
    } catch (err) {
        console.error('[CRON] funds job threw', err);
    }
};
