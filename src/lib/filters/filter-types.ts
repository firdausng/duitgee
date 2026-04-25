/**
 * Filter rail — types, encoding, decoding.
 *
 * A filter is stored in the URL as one or more `f=` query params with the
 * shape `field:op:value`. Multi-value enum filters join values with `,`.
 * Negation is a `not:` prefix on the op:
 *   f=category:is:Food           → Category is Food
 *   f=category:is:Food,Groceries → Category is any of Food or Groceries
 *   f=amount:gt:50               → Amount > 50
 *   f=amount:between:10,50       → Amount between 10 and 50
 *   f=paymentType:not.is:cash    → NOT Payment type is cash
 *
 * All filters are ANDed together. Order is semantically irrelevant.
 */

/** Fields a user can filter on. Date is NOT included here — it keeps its own
 *  dedicated date-pills control in the top bar. */
export type FilterField =
    | 'category'
    | 'fund'
    | 'paidBy'
    | 'paymentType'
    | 'amount'
    | 'tag';

/** Operators. Not every op is valid for every field — see FIELD_CONFIG below. */
export type FilterOp = 'is' | 'gt' | 'lt' | 'between';

/** A single filter pill. `values` is always an array for uniform handling:
 *  - `is` on an enum: any-of-many (array of IDs/names)
 *  - `gt` / `lt` on amount: single-value array
 *  - `between`: two-element array [min, max] */
export interface FilterPill {
    field: FilterField;
    op: FilterOp;
    values: string[];
    negated: boolean;
}

/** Static per-field config. Drives the AddFilterPopover value picker. */
export const FIELD_CONFIG: Record<
    FilterField,
    {
        label: string;
        kind: 'enum' | 'number';
        /** Ops allowed for this field, in display order. */
        ops: FilterOp[];
        /** Special sentinel values recognized for this field.
         *  e.g. paidBy supports `__vault__` for "vault-level (null payer)";
         *       fund supports `__none__` for "no fund". */
        specialValues?: Record<string, string>;
    }
> = {
    category:    { label: 'Category',     kind: 'enum',   ops: ['is'] },
    fund:        { label: 'Fund',         kind: 'enum',   ops: ['is'], specialValues: { __none__: 'No fund' } },
    paidBy:      { label: 'Paid by',      kind: 'enum',   ops: ['is'], specialValues: { __vault__: 'Vault-level' } },
    paymentType: { label: 'Payment type', kind: 'enum',   ops: ['is'] },
    amount:      { label: 'Amount',       kind: 'number', ops: ['gt', 'lt', 'between'] },
    tag:         { label: 'Tag',          kind: 'enum',   ops: ['is'], specialValues: { __none__: 'No tag' } },
};

/** Pretty operator label for display. */
export function opLabel(op: FilterOp, isMulti: boolean): string {
    if (op === 'is') return isMulti ? 'is any of' : 'is';
    if (op === 'gt') return '>';
    if (op === 'lt') return '<';
    return 'between';
}

// ── URL encoding ──────────────────────────────────────────────────────────────

const SEP_PARTS = ':';
const SEP_VALUES = ',';
const NEG_PREFIX = 'not.';

/** Serialize one pill to the `f=` value portion. */
export function encodePill(p: FilterPill): string {
    const op = p.negated ? `${NEG_PREFIX}${p.op}` : p.op;
    const value = p.values.map((v) => encodeURIComponent(v)).join(SEP_VALUES);
    return `${p.field}${SEP_PARTS}${op}${SEP_PARTS}${value}`;
}

/** Serialize an array of pills to the `f=` params (one string per pill,
 *  the caller is responsible for building the full URLSearchParams). */
export function encodePills(pills: FilterPill[]): string[] {
    return pills.map(encodePill);
}

/** Parse a single `f=` value. Returns null if the input is malformed —
 *  bad values are dropped silently rather than crashing the page. */
export function decodePill(raw: string): FilterPill | null {
    if (!raw) return null;
    const parts = raw.split(SEP_PARTS);
    if (parts.length < 3) return null;

    const field = parts[0] as FilterField;
    if (!(field in FIELD_CONFIG)) return null;

    let opRaw = parts[1];
    const negated = opRaw.startsWith(NEG_PREFIX);
    if (negated) opRaw = opRaw.slice(NEG_PREFIX.length);
    const op = opRaw as FilterOp;
    if (!FIELD_CONFIG[field].ops.includes(op)) return null;

    // Re-join remaining parts in case the value itself contained a colon.
    const valueRaw = parts.slice(2).join(SEP_PARTS);
    const values = valueRaw
        .split(SEP_VALUES)
        .map((v) => decodeURIComponent(v))
        .filter((v) => v.length > 0);
    if (values.length === 0) return null;

    return { field, op, values, negated };
}

/** Parse all `f=…` params from a URLSearchParams into pill array. */
export function decodePills(params: URLSearchParams): FilterPill[] {
    return params
        .getAll('f')
        .map(decodePill)
        .filter((p): p is FilterPill => p !== null);
}

/** Replace the `f=` params in a URLSearchParams with the given pills (in place). */
export function writePillsToSearchParams(
    params: URLSearchParams,
    pills: FilterPill[],
): void {
    params.delete('f');
    for (const s of encodePills(pills)) {
        params.append('f', s);
    }
}
