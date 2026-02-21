import { startOfMonth, endOfMonth, startOfDay, endOfDay, addDays, formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';

export type ReplenishmentSchedule = 'monthly' | 'biweekly' | 'weekly' | null | undefined;

/**
 * Calculate the start and end of a cycle period given a replenishment schedule.
 * @param schedule - The replenishment schedule, or null/undefined for manual funds.
 * @param from - The reference date to base the period on (defaults to now).
 */
export function calculateCyclePeriod(
    schedule: ReplenishmentSchedule,
    from: Date = new UTCDate(),
): { periodStart: string; periodEnd: string } {
    switch (schedule) {
        case 'monthly':
            return {
                periodStart: formatISO(startOfMonth(from)),
                periodEnd: formatISO(endOfMonth(from)),
            };

        case 'biweekly': {
            const start = startOfDay(from);
            return {
                periodStart: formatISO(start),
                periodEnd: formatISO(endOfDay(addDays(start, 13))),
            };
        }

        case 'weekly': {
            const start = startOfDay(from);
            return {
                periodStart: formatISO(start),
                periodEnd: formatISO(endOfDay(addDays(start, 6))),
            };
        }

        default:
            // Manual: open-ended cycle, effectively never expires
            return {
                periodStart: formatISO(startOfDay(from)),
                periodEnd: '2099-12-31T23:59:59.999Z',
            };
    }
}
