import { describe, it, expect } from 'vitest';
import { groupExpensesByDay } from './groupExpensesByDay';

type E = { id: string; date: string; amount: number };

describe('groupExpensesByDay', () => {
	// Build ISO strings from local Date components so tests are TZ-independent.
	const localISO = (y: number, m: number, d: number, h = 10) =>
		new Date(y, m - 1, d, h, 0, 0).toISOString();

	it('groups expenses that fall on the same local calendar day', () => {
		const items: E[] = [
			{ id: 'a', date: localISO(2026, 4, 20, 9), amount: 10 },
			{ id: 'b', date: localISO(2026, 4, 20, 15), amount: 5 },
			{ id: 'c', date: localISO(2026, 4, 22, 9), amount: 7 },
		];
		const groups = groupExpensesByDay(items);
		expect(groups).toHaveLength(2);
		expect(groups[0].items.map((i) => i.id)).toEqual(['a', 'b']);
		expect(groups[0].total).toBe(15);
		expect(groups[0].count).toBe(2);
		expect(groups[1].items.map((i) => i.id)).toEqual(['c']);
	});

	it('preserves input order of groups and items within a group', () => {
		const items: E[] = [
			{ id: 'a', date: localISO(2026, 4, 20, 10), amount: 1 },
			{ id: 'b', date: localISO(2026, 4, 18, 10), amount: 1 },
			{ id: 'c', date: localISO(2026, 4, 20, 11), amount: 1 },
		];
		const groups = groupExpensesByDay(items);
		// first-seen day must come first regardless of chronology
		expect(groups).toHaveLength(2);
		expect(groups[0].items.map((i) => i.id)).toEqual(['a', 'c']);
		expect(groups[1].items.map((i) => i.id)).toEqual(['b']);
	});

	it('returns an empty array for empty input', () => {
		expect(groupExpensesByDay([])).toEqual([]);
	});

	it('handles a single item', () => {
		const groups = groupExpensesByDay<E>([
			{ id: 'x', date: localISO(2026, 4, 20, 5), amount: 42 },
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0].total).toBe(42);
		expect(groups[0].count).toBe(1);
	});
});
