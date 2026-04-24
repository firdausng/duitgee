import { describe, it, expect } from 'vitest';
import { computeNextOccurrence, isScheduleExhausted } from './recurringSchedule';

// Build dates from local components so tests are timezone-independent.
const d = (y: number, m: number, day: number, h = 9) => new Date(y, m - 1, day, h, 0, 0);

describe('computeNextOccurrence', () => {
	it('returns the anchor when anchor is strictly after `from`', () => {
		const anchor = d(2026, 5, 10);
		const from = d(2026, 5, 1);
		expect(computeNextOccurrence(anchor, 'day', 1, from)).toEqual(anchor);
	});

	it('daily interval advances by N days', () => {
		const anchor = d(2026, 4, 1);
		const from = d(2026, 4, 10, 12); // 9 days later, halfway through the day
		const next = computeNextOccurrence(anchor, 'day', 1, from);
		expect(next).toEqual(d(2026, 4, 11));
	});

	it('every-2-days skips alternate days', () => {
		const anchor = d(2026, 4, 1);
		const from = d(2026, 4, 2, 12);
		const next = computeNextOccurrence(anchor, 'day', 2, from);
		expect(next).toEqual(d(2026, 4, 3));
	});

	it('weekly preserves day of week', () => {
		// Wed Apr 1, 2026
		const anchor = d(2026, 4, 1);
		const from = d(2026, 4, 5); // Sunday
		const next = computeNextOccurrence(anchor, 'week', 1, from);
		expect(next).toEqual(d(2026, 4, 8)); // next Wed
	});

	it('every-2-weeks advances by 14 days', () => {
		const anchor = d(2026, 4, 1);
		const from = d(2026, 4, 15, 12); // exactly 14 days + 3h after anchor
		const next = computeNextOccurrence(anchor, 'week', 2, from);
		expect(next).toEqual(d(2026, 4, 29));
	});

	it('monthly on the 31st clamps to last day of shorter months', () => {
		const anchor = d(2026, 1, 31);
		// After Jan 31 → next should be Feb 28 (2026 is not a leap year)
		expect(computeNextOccurrence(anchor, 'month', 1, d(2026, 2, 1))).toEqual(d(2026, 2, 28));
		// After Feb 27 → next should still be Feb 28 (the clamped Feb occurrence)
		expect(computeNextOccurrence(anchor, 'month', 1, d(2026, 2, 27))).toEqual(d(2026, 2, 28));
		// After Feb 28 → next should be Mar 31 (not clamped)
		expect(computeNextOccurrence(anchor, 'month', 1, d(2026, 2, 28, 23))).toEqual(d(2026, 3, 31));
	});

	it('yearly Feb 29 clamps to Feb 28 in non-leap years', () => {
		const anchor = d(2024, 2, 29); // leap year
		const from = d(2024, 3, 1);
		expect(computeNextOccurrence(anchor, 'year', 1, from)).toEqual(d(2025, 2, 28));
	});

	it('handles a far-past anchor efficiently', () => {
		// Daily with a 5-year-old anchor — should compute without timing out.
		const anchor = d(2020, 1, 1);
		const from = d(2026, 4, 24, 10);
		const next = computeNextOccurrence(anchor, 'day', 1, from);
		expect(next).toEqual(d(2026, 4, 25));
	});

	it('rejects non-positive interval', () => {
		expect(() => computeNextOccurrence(d(2026, 4, 1), 'day', 0, d(2026, 4, 2))).toThrow();
		expect(() => computeNextOccurrence(d(2026, 4, 1), 'day', -1, d(2026, 4, 2))).toThrow();
	});

	it('when `from` exactly equals an occurrence, returns the following one', () => {
		const anchor = d(2026, 4, 1);
		const from = d(2026, 4, 1); // exact match
		const next = computeNextOccurrence(anchor, 'day', 1, from);
		expect(next).toEqual(d(2026, 4, 2));
	});
});

describe('isScheduleExhausted', () => {
	it('returns false when no end conditions are set', () => {
		expect(
			isScheduleExhausted({
				occurrenceCount: 5,
				endAfterCount: null,
				endDate: null,
				nextOccurrenceAt: d(2026, 5, 1),
			}),
		).toBe(false);
	});

	it('returns true when occurrenceCount reaches endAfterCount', () => {
		expect(
			isScheduleExhausted({
				occurrenceCount: 10,
				endAfterCount: 10,
				endDate: null,
				nextOccurrenceAt: d(2026, 5, 1),
			}),
		).toBe(true);
	});

	it('returns true when next occurrence passes endDate', () => {
		expect(
			isScheduleExhausted({
				occurrenceCount: 3,
				endAfterCount: null,
				endDate: d(2026, 4, 30),
				nextOccurrenceAt: d(2026, 5, 1),
			}),
		).toBe(true);
	});

	it('returns false when next occurrence still within endDate', () => {
		expect(
			isScheduleExhausted({
				occurrenceCount: 3,
				endAfterCount: null,
				endDate: d(2026, 5, 15),
				nextOccurrenceAt: d(2026, 5, 1),
			}),
		).toBe(false);
	});
});
