import {format, parseISO} from "date-fns";
import type {Expense} from "../types";
import {
    formatCurrency as formatCurrencyUtil,
    getDateRange as getDateRangeUtil,
    formatDateTime as formatDateTimeUtil,
    type DateFilter as DateFilterType
} from "$lib/utils";

// Re-export types
export type DateFilter = DateFilterType;

export type DateGroup = {
    dateKey: string;
    dateLabel: string;
    expenses: Expense[];
};

// Re-export shared function
export const getDateRange = getDateRangeUtil;

export function groupExpensesByDate(expenses: Expense[]): DateGroup[] {
    const grouped = new Map<string, Expense[]>();

    for (const expense of expenses) {
        const date = parseISO(expense.date);
        const dateKey = format(date, 'yyyy-MM-dd');

        if (!grouped.has(dateKey)) {
            grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(expense);
    }

    return Array.from(grouped.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([dateKey, expenseList]) => ({
            dateKey,
            dateLabel: format(parseISO(dateKey), 'EEEE, MMM d, yyyy'),
            expenses: expenseList
        }));
}

// Re-export shared functions
export const formatCurrency = formatCurrencyUtil;
export const formatDate = formatDateTimeUtil;

export function getDateFilterLabel(dateFilter: DateFilter): string {
    switch (dateFilter) {
        case 'today':
            return 'Today';
        case 'week':
            return 'This Week';
        case 'month':
            return 'This Month';
        case 'year':
            return 'This Year';
        case 'all':
            return 'All Time';
        default:
            return 'All Time';
    }
}
