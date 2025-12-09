import {format, parseISO} from "date-fns";
import type {Expense} from "../types";

export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export type DateGroup = {
    dateKey: string;
    dateLabel: string;
    expenses: Expense[];
};

export function getDateRange(dateFilter: DateFilter, startDate?: string, endDate?: string): { startDate?: string; endDate?: string } {
    const now = new Date();

    switch (dateFilter) {
        case 'all':
            return {};

        case 'today': {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return {
                startDate: start.toISOString(),
                endDate: end.toISOString()
            };
        }

        case 'week': {
            const dayOfWeek = now.getDay();
            const start = new Date(now);
            start.setDate(now.getDate() - dayOfWeek);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            return {
                startDate: start.toISOString(),
                endDate: end.toISOString()
            };
        }

        case 'month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            return {
                startDate: start.toISOString(),
                endDate: end.toISOString()
            };
        }

        case 'year': {
            const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
            const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            return {
                startDate: start.toISOString(),
                endDate: end.toISOString()
            };
        }

        case 'custom': {
            if (!startDate || !endDate) return {};
            return {startDate, endDate};
        }

        default:
            return {};
    }
}

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

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

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
        case 'custom':
            return 'Custom Range';
        default:
            return 'All Time';
    }
}
