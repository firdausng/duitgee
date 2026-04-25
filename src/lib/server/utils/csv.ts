import Papa from 'papaparse';
import { paymentTypes, defaultPaymentType } from '$lib/configurations/paymentTypes';
import { categoryData } from '$lib/configurations/categories';
import type {
    NormalizedImportRow,
    ImportRowError,
} from '$lib/schemas/csv';

// Header order is also export order. Keep stable — users may build downstream
// tooling against it.
export const CSV_HEADERS = [
    'id',
    'date',
    'amount',
    'category',
    'paymentType',
    'note',
    'paidByEmail',
    'tags',
    'fundName',
    'createdAt',
    'createdBy',
] as const;

export type ExportRow = {
    id: string;
    date: string;
    amount: number;
    categoryName: string;
    paymentType: string;
    note: string | null;
    paidByEmail: string | null;
    tagNames: string[];
    fundName: string | null;
    createdAt: string;
    createdBy: string;
};

const PAYMENT_TYPE_VALUES = new Set(paymentTypes.map((p) => p.value));

const escapeCsvField = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Quote if the field contains a comma, quote, or newline. Double internal quotes.
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export const serializeCsvHeader = (): string => {
    return CSV_HEADERS.map(escapeCsvField).join(',') + '\n';
};

export const serializeExpenseRow = (row: ExportRow): string => {
    const fields: (string | number | null)[] = [
        row.id,
        row.date,
        row.amount,
        row.categoryName,
        row.paymentType,
        row.note,
        row.paidByEmail,
        row.tagNames.join(';'),
        row.fundName,
        row.createdAt,
        row.createdBy,
    ];
    return fields.map(escapeCsvField).join(',') + '\n';
};

export interface ImportLookups {
    // email → userId for active members of this vault
    emailToUserId: Map<string, string>;
    // tag name → tagId for existing vault tags (lowercased keys for case-insensitive match)
    tagNameToId: Map<string, string>;
}

export interface ParsedImportResult {
    validRows: NormalizedImportRow[];
    errors: ImportRowError[];
    /** Tag names referenced in the CSV that do not yet exist in the vault. */
    newTagNames: string[];
    /** Email addresses referenced via paidByEmail. Returned so the caller can do one bulk lookup. */
    referencedEmails: string[];
    /** Raw parsed rows including their line numbers — used for the second pass after lookups complete. */
    totalRows: number;
}

interface RawCsvRow {
    [key: string]: string | undefined;
}

/**
 * Parse a CSV string into raw rows + collect referenced emails / tag names.
 * Does NOT resolve foreign keys; the caller does that with one DB roundtrip
 * after parsing, then calls {@link normalizeRows} to produce final output.
 */
export const parseCsvText = (text: string): {
    rows: RawCsvRow[];
    parseErrors: ImportRowError[];
    referencedEmails: string[];
    referencedTagNames: string[];
} => {
    const result = Papa.parse<RawCsvRow>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: false, // we coerce ourselves to keep error messages precise
        transformHeader: (h) => h.trim(),
    });

    const parseErrors: ImportRowError[] = [];
    for (const err of result.errors) {
        // papaparse uses 0-indexed row; +1 for the data row, +1 again for the header line.
        const lineNumber = (err.row ?? 0) + 2;
        parseErrors.push({
            lineNumber,
            field: '_parser',
            value: '',
            error: err.message,
        });
    }

    const referencedEmails = new Set<string>();
    const referencedTagNames = new Set<string>();
    for (const row of result.data) {
        const email = (row.paidByEmail ?? '').trim();
        if (email) referencedEmails.add(email.toLowerCase());
        const tags = (row.tags ?? '').split(';').map((t) => t.trim()).filter(Boolean);
        for (const t of tags) referencedTagNames.add(t);
    }

    return {
        rows: result.data,
        parseErrors,
        referencedEmails: Array.from(referencedEmails),
        referencedTagNames: Array.from(referencedTagNames),
    };
};

/**
 * Coerce raw CSV rows into validated, FK-resolved import rows.
 * Uses provided lookups to resolve email → userId and to detect new tag names.
 */
export const normalizeRows = (
    rows: RawCsvRow[],
    lookups: ImportLookups,
): ParsedImportResult => {
    const validRows: NormalizedImportRow[] = [];
    const errors: ImportRowError[] = [];
    const newTagNames = new Set<string>();
    const referencedEmails = new Set<string>();

    rows.forEach((raw, idx) => {
        // +2: account for header row + 1-indexed line numbers users see.
        const lineNumber = idx + 2;
        const rowErrors: ImportRowError[] = [];

        const dateRaw = (raw.date ?? '').trim();
        let date = '';
        if (!dateRaw) {
            rowErrors.push({ lineNumber, field: 'date', value: dateRaw, error: 'Date is required' });
        } else {
            const parsed = new Date(dateRaw);
            if (isNaN(parsed.getTime())) {
                rowErrors.push({ lineNumber, field: 'date', value: dateRaw, error: 'Invalid date format (expected ISO 8601)' });
            } else {
                date = parsed.toISOString();
            }
        }

        const amountRaw = (raw.amount ?? '').trim();
        let amount = 0;
        if (!amountRaw) {
            rowErrors.push({ lineNumber, field: 'amount', value: amountRaw, error: 'Amount is required' });
        } else {
            const parsed = Number(amountRaw);
            if (!Number.isFinite(parsed) || parsed <= 0) {
                rowErrors.push({ lineNumber, field: 'amount', value: amountRaw, error: 'Amount must be a positive number' });
            } else {
                amount = parsed;
            }
        }

        const categoryRaw = (raw.category ?? '').trim();
        if (!categoryRaw) {
            rowErrors.push({ lineNumber, field: 'category', value: categoryRaw, error: 'Category is required' });
        }
        // Resolve to canonical category name if the CSV name matches a known one;
        // otherwise pass through as free-form (createExpense handler already accepts this).
        const categoryName =
            categoryData.categories.find((c) => c.name.toLowerCase() === categoryRaw.toLowerCase())?.name ??
            categoryRaw;

        const paymentTypeRaw = ((raw.paymentType ?? '').trim() || defaultPaymentType).toLowerCase();
        if (!PAYMENT_TYPE_VALUES.has(paymentTypeRaw)) {
            rowErrors.push({
                lineNumber,
                field: 'paymentType',
                value: paymentTypeRaw,
                error: `Unknown payment type. Allowed: ${Array.from(PAYMENT_TYPE_VALUES).join(', ')}`,
            });
        }

        const note = (raw.note ?? '').trim() || undefined;

        const emailRaw = (raw.paidByEmail ?? '').trim().toLowerCase();
        let paidBy: string | null = null;
        if (emailRaw) {
            referencedEmails.add(emailRaw);
            const userId = lookups.emailToUserId.get(emailRaw);
            if (!userId) {
                rowErrors.push({
                    lineNumber,
                    field: 'paidByEmail',
                    value: emailRaw,
                    error: 'Member with this email not found in this vault',
                });
            } else {
                paidBy = userId;
            }
        }

        const tagNames = (raw.tags ?? '')
            .split(';')
            .map((t) => t.trim())
            .filter(Boolean);
        for (const t of tagNames) {
            if (!lookups.tagNameToId.has(t.toLowerCase())) {
                newTagNames.add(t);
            }
        }

        if (rowErrors.length > 0) {
            errors.push(...rowErrors);
            return;
        }

        validRows.push({
            lineNumber,
            date,
            amount,
            categoryName,
            paymentType: paymentTypeRaw,
            note,
            paidBy,
            tagNames,
        });
    });

    return {
        validRows,
        errors,
        newTagNames: Array.from(newTagNames),
        referencedEmails: Array.from(referencedEmails),
        totalRows: rows.length,
    };
};
