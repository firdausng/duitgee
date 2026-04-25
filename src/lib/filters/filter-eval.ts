/**
 * Client-side evaluator — applies a list of filter pills to an expense array.
 *
 * Each pill narrows the list (AND semantics). Negated pills invert the match.
 * Shape of the "expense" the caller feeds is the same shape `/api/getExpenses`
 * returns, minimally with category.name, fundId/fundName, paidBy, paymentType,
 * and amount.
 */

import type { FilterPill } from './filter-types';

export interface EvaluableExpense {
    amount: number;
    paymentType?: string | null;
    paidBy?: string | null;
    paidByName?: string | null;
    fundId?: string | null;
    fundName?: string | null;
    category?: { name?: string | null } | null;
    tags?: Array<{ id: string; name: string }> | null;
}

/** Apply the `pill` to a single expense. Returns true if kept. */
function matchPill(e: EvaluableExpense, pill: FilterPill): boolean {
    let hit = false;

    switch (pill.field) {
        case 'category': {
            const v = e.category?.name ?? '';
            hit = pill.values.includes(v);
            break;
        }
        case 'fund': {
            // Special: __none__ matches expenses with no fund.
            const hasNone = pill.values.includes('__none__');
            const realValues = pill.values.filter((v) => v !== '__none__');
            if (hasNone && !e.fundId) hit = true;
            if (!hit && e.fundId && realValues.includes(e.fundId)) hit = true;
            // Fallback: some surfaces filter by fund name rather than id.
            if (!hit && e.fundName && realValues.includes(e.fundName)) hit = true;
            break;
        }
        case 'paidBy': {
            // Special: __vault__ matches vault-level expenses (null payer).
            const hasVault = pill.values.includes('__vault__');
            const realValues = pill.values.filter((v) => v !== '__vault__');
            if (hasVault && !e.paidBy) hit = true;
            if (!hit && e.paidBy && realValues.includes(e.paidBy)) hit = true;
            // Fallback: match by display name when user-id is unknown.
            if (!hit && e.paidByName && realValues.includes(e.paidByName)) hit = true;
            break;
        }
        case 'paymentType': {
            hit = pill.values.includes(e.paymentType ?? '');
            break;
        }
        case 'amount': {
            const amt = e.amount;
            if (pill.op === 'gt') {
                hit = amt > Number(pill.values[0] ?? 0);
            } else if (pill.op === 'lt') {
                hit = amt < Number(pill.values[0] ?? 0);
            } else if (pill.op === 'between') {
                const [min, max] = [Number(pill.values[0] ?? 0), Number(pill.values[1] ?? 0)];
                hit = amt >= min && amt <= max;
            }
            break;
        }
        case 'tag': {
            // __none__ matches expenses with no tags. Other values match by tag id OR name.
            const tags = e.tags ?? [];
            const hasNone = pill.values.includes('__none__');
            const realValues = pill.values.filter((v) => v !== '__none__');
            if (hasNone && tags.length === 0) hit = true;
            if (!hit && tags.length > 0 && realValues.length > 0) {
                hit = tags.some((t) => realValues.includes(t.id) || realValues.includes(t.name));
            }
            break;
        }
    }

    return pill.negated ? !hit : hit;
}

export function applyFilters<T extends EvaluableExpense>(
    expenses: T[],
    pills: FilterPill[],
): T[] {
    if (pills.length === 0) return expenses;
    return expenses.filter((e) => pills.every((pill) => matchPill(e, pill)));
}
