import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundCycles, fundPolicies } from '$lib/server/db/schema';
import { and, eq, isNull, isNotNull, lte } from 'drizzle-orm';
import { UTCDate } from '@date-fns/utc';
import { formatISO } from 'date-fns';
import { getActiveCycleOrCreate } from './getActiveCycleOrCreate';
import { applyAutoReplenishment } from './applyAutoReplenishment';
import { checkVaultEntitlement } from '$lib/server/utils/entitlements';

export const CRON_SYSTEM_USER_ID = 'system:cron';

export interface ProcessDueFundCyclesOptions {
    now?: Date;
    fundId?: string;
}

export interface ProcessDueFundCyclesResult {
    processed: number;
    rolled: number;
    replenished: number;
    skipped: number;
    errors: Array<{ fundId: string; message: string }>;
}

/**
 * Roll over expired fund cycles and apply auto-replenishment for funds that
 * are entitled to it. Idempotent — re-running on the same day is safe because
 * rolled cycles no longer match the "expired + active" query.
 *
 * @param env - Cloudflare bindings
 * @param options.now - Inject a reference date (tests / admin trigger). Defaults to now.
 * @param options.fundId - Restrict processing to a single fund (admin dry-run).
 */
export const processDueFundCycles = async (
    env: Cloudflare.Env,
    options: ProcessDueFundCyclesOptions = {},
): Promise<ProcessDueFundCyclesResult> => {
    const client = drizzle(env.DB, { schema });
    const now = options.now ?? new UTCDate();
    const nowIso = formatISO(new UTCDate(now));

    const dueConditions = [
        eq(fundCycles.status, 'active'),
        lte(fundCycles.periodEnd, nowIso),
        isNotNull(fundPolicies.replenishmentSchedule),
        isNull(funds.deletedAt),
        eq(funds.status, 'active'),
    ];
    if (options.fundId) {
        dueConditions.push(eq(funds.id, options.fundId));
    }

    const dueFunds = await client
        .select({
            fundId: funds.id,
            vaultId: funds.vaultId,
        })
        .from(fundCycles)
        .innerJoin(funds, eq(funds.id, fundCycles.fundId))
        .innerJoin(fundPolicies, eq(fundPolicies.fundId, funds.id))
        .where(and(...dueConditions));

    const result: ProcessDueFundCyclesResult = {
        processed: 0,
        rolled: 0,
        replenished: 0,
        skipped: 0,
        errors: [],
    };

    for (const { fundId, vaultId } of dueFunds) {
        try {
            const newCycle = await getActiveCycleOrCreate(fundId, CRON_SYSTEM_USER_ID, env);
            result.rolled++;

            const entitled = await checkVaultEntitlement(
                vaultId,
                'fund:auto_replenishment',
                env,
            );

            if (entitled) {
                const replenishment = await applyAutoReplenishment(
                    fundId,
                    newCycle.id,
                    CRON_SYSTEM_USER_ID,
                    env,
                );
                if (replenishment.applied) {
                    result.replenished++;
                } else {
                    result.skipped++;
                }
            } else {
                result.skipped++;
            }

            result.processed++;
        } catch (error) {
            result.errors.push({
                fundId,
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return result;
};
