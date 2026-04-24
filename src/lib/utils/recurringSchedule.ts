import { addDays, addMonths, addWeeks, addYears } from 'date-fns';

export type ScheduleUnit = 'day' | 'week' | 'month' | 'year';

const DAY_MS = 24 * 60 * 60 * 1000;

function stepBy(anchor: Date, unit: ScheduleUnit, n: number): Date {
	switch (unit) {
		case 'day':
			return addDays(anchor, n);
		case 'week':
			return addWeeks(anchor, n);
		case 'month':
			return addMonths(anchor, n);
		case 'year':
			return addYears(anchor, n);
	}
}

/**
 * Compute the next occurrence of a recurring schedule strictly after `from`.
 *
 * Rules:
 *  - Occurrence times are anchorDate + k * scheduleInterval * scheduleUnit for k = 0, 1, 2, …
 *  - If anchorDate is already in the future relative to `from`, anchorDate is returned.
 *  - Month-end and leap-day clamping follow date-fns: Jan 31 + 1 month = Feb 28 (or 29).
 *    The next monthly occurrence restarts from anchorDate each step, so "every month on
 *    the 31st" gives Jan 31, Feb 28/29, Mar 31, …
 */
export function computeNextOccurrence(
	anchorDate: Date,
	scheduleUnit: ScheduleUnit,
	scheduleInterval: number,
	from: Date,
): Date {
	if (!Number.isInteger(scheduleInterval) || scheduleInterval < 1) {
		throw new Error('scheduleInterval must be a positive integer');
	}

	if (anchorDate.getTime() > from.getTime()) {
		return new Date(anchorDate.getTime());
	}

	// Estimate a starting k analytically, then walk forward. The -1 margin
	// absorbs day-of-month clamping drift (e.g., Jan 31 → Feb 28 shortens the
	// calendar-month difference).
	let k: number;
	const diffMs = from.getTime() - anchorDate.getTime();
	switch (scheduleUnit) {
		case 'day':
			k = Math.max(0, Math.floor(diffMs / (scheduleInterval * DAY_MS)));
			break;
		case 'week':
			k = Math.max(0, Math.floor(diffMs / (scheduleInterval * 7 * DAY_MS)));
			break;
		case 'month': {
			const months =
				(from.getFullYear() - anchorDate.getFullYear()) * 12 +
				(from.getMonth() - anchorDate.getMonth());
			k = Math.max(0, Math.floor(months / scheduleInterval) - 1);
			break;
		}
		case 'year': {
			const years = from.getFullYear() - anchorDate.getFullYear();
			k = Math.max(0, Math.floor(years / scheduleInterval) - 1);
			break;
		}
	}

	let candidate = stepBy(anchorDate, scheduleUnit, scheduleInterval * k);
	while (candidate.getTime() <= from.getTime()) {
		k++;
		candidate = stepBy(anchorDate, scheduleUnit, scheduleInterval * k);
	}
	return candidate;
}

/**
 * Compute the date of the last occurrence for a bounded (installment) rule.
 * Given anchor + scheduleUnit/interval + endAfterCount, returns
 *   anchor + (endAfterCount - 1) * interval
 * in the rule's schedule unit, with date-fns' month-end clamping.
 */
export function computeFinalOccurrence(
	anchor: Date,
	scheduleUnit: ScheduleUnit,
	scheduleInterval: number,
	endAfterCount: number,
): Date {
	if (endAfterCount < 1) return new Date(anchor.getTime());
	return stepBy(anchor, scheduleUnit, (endAfterCount - 1) * scheduleInterval);
}

/**
 * Check whether a recurring rule has exhausted its end conditions.
 * Returns true if the rule should be marked `ended`.
 */
export function isScheduleExhausted(args: {
	occurrenceCount: number;
	endAfterCount: number | null;
	endDate: Date | null;
	nextOccurrenceAt: Date;
}): boolean {
	if (args.endAfterCount !== null && args.occurrenceCount >= args.endAfterCount) {
		return true;
	}
	if (args.endDate !== null && args.nextOccurrenceAt.getTime() > args.endDate.getTime()) {
		return true;
	}
	return false;
}
