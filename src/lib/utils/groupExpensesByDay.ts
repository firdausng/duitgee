export interface ExpenseDayGroup<T> {
	dayKey: string;
	dayStartLocal: Date;
	items: T[];
	total: number;
	count: number;
}

type DatedAmount = { date: string; amount: number };

function localDayKey(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/**
 * Buckets expenses by local calendar day, preserving input order.
 * Callers are expected to pre-sort (the expenses API returns newest first).
 */
export function groupExpensesByDay<T extends DatedAmount>(expenses: T[]): ExpenseDayGroup<T>[] {
	const groups = new Map<string, ExpenseDayGroup<T>>();
	const order: string[] = [];

	for (const e of expenses) {
		const local = new Date(e.date);
		const key = localDayKey(local);
		let g = groups.get(key);
		if (!g) {
			g = {
				dayKey: key,
				dayStartLocal: new Date(local.getFullYear(), local.getMonth(), local.getDate()),
				items: [],
				total: 0,
				count: 0,
			};
			groups.set(key, g);
			order.push(key);
		}
		g.items.push(e);
		g.total += e.amount;
		g.count += 1;
	}

	return order.map((k) => groups.get(k)!);
}
