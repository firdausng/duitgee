import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };


export const slugify = (...args: string[]): string => {
    const value = args.join(' ')

    return value
        .normalize('NFD') // split an accented letter in the base letter and the acent
        .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
        .replace(/\s+/g, '-') // separator
}

/**
 * Converts a UTC ISO string to local datetime-local format (YYYY-MM-DDTHH:mm)
 * for use with HTML datetime-local inputs
 *
 * Uses date-fns for consistent date handling across the application.
 *
 * @param utcIsoString - UTC date in ISO format (e.g., "2025-12-08T10:30:00.000Z")
 * @returns Local datetime string (e.g., "2025-12-08T18:30")
 */
export const utcToLocalDatetimeString = (utcIsoString: string): string => {
    const date = parseISO(utcIsoString);
    return format(date, "yyyy-MM-dd'T'HH:mm");
};

/**
 * Converts a local datetime-local string to UTC ISO format
 * for sending to the API
 *
 * Uses native toISOString() to ensure consistent UTC format with 'Z' suffix.
 *
 * @param localDatetime - Local datetime string (e.g., "2025-12-08T18:30")
 * @returns UTC ISO string (e.g., "2025-12-08T10:30:00.000Z")
 */
export const localDatetimeToUtcIso = (localDatetime: string): string => {
    const date = new Date(localDatetime);
    return date.toISOString();
};

/**
 * Formats a Date object to local datetime-local format (YYYY-MM-DDTHH:mm)
 * for use with HTML datetime-local inputs
 *
 * Uses date-fns for consistent date handling across the application.
 *
 * @param date - Date object or ISO string
 * @returns Local datetime string (e.g., "2025-12-08T18:30")
 */
export const formatDatetimeLocal = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, "yyyy-MM-dd'T'HH:mm");
};

/**
 * Formats a number as currency using the specified locale and currency
 *
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @param locale - BCP 47 language tag (default: 'en-US')
 * @param currency - ISO 4217 currency code (default: 'USD')
 * @returns Formatted currency string (e.g., "$1,234.56", "Rp 1.234.567", "¥1,235")
 *
 * @example
 * formatCurrency(1234.56) // "$1,234.56" (US Dollar)
 * formatCurrency(1234567, 2, 'id-ID', 'IDR') // "Rp 1.234.567,00" (Indonesian Rupiah)
 * formatCurrency(1234.56, 0, 'ja-JP', 'JPY') // "¥1,235" (Japanese Yen)
 */
export const formatCurrency = (
    amount: number,
    decimals = 2,
    locale: string = 'en-US',
    currency: string = 'USD'
): string => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(amount);
};

/**
 * Date filter types for filtering expenses by time period
 */
export type DateFilter =
    | 'all'
    | 'today'
    | 'yesterday'
    | 'week'
    | 'month'
    | 'year'
    | 'last7'
    | 'last30'
    | 'last90'
    | 'custom';

/**
 * Calculates date range based on filter type
 *
 * @param dateFilter - The type of date filter to apply
 * @param startDate - Optional start date (ISO string) for 'custom' filter
 * @param endDate - Optional end date (ISO string) for 'custom' filter
 * @returns Object with optional startDate and endDate as ISO strings
 */
export function getDateRange(
    dateFilter: DateFilter,
    startDate?: string,
    endDate?: string
): { startDate?: string; endDate?: string } {
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

        case 'yesterday': {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
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

        case 'last7':
        case 'last30':
        case 'last90': {
            const days = dateFilter === 'last7' ? 7 : dateFilter === 'last30' ? 30 : 90;
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1), 0, 0, 0);
            return {
                startDate: start.toISOString(),
                endDate: end.toISOString()
            };
        }

        case 'custom': {
            if (!startDate || !endDate) return {};
            return { startDate, endDate };
        }

        default:
            return {};
    }
}

/**
 * Calculates the *prior* period for a given DateFilter, used for vs-last-period
 * comparisons in dashboard cards.
 *
 * - today → yesterday
 * - yesterday → day before yesterday
 * - week → previous calendar week (Sun–Sat)
 * - month → previous calendar month
 * - year → previous calendar year
 * - last7 / last30 / last90 → the N days immediately before the current window
 * - custom → same duration immediately before the start date (only when both bounds are set)
 * - all → returns {} (no comparison possible)
 *
 * For 'custom', dates are expected to be ISO strings (UTC).
 */
export function getPriorDateRange(
    dateFilter: DateFilter,
    startDate?: string,
    endDate?: string,
): { startDate?: string; endDate?: string } {
    const now = new Date();

    switch (dateFilter) {
        case 'all':
            return {};

        case 'today': {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }

        case 'yesterday': {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }

        case 'week': {
            const dayOfWeek = now.getDay();
            const thisWeekStart = new Date(now);
            thisWeekStart.setDate(now.getDate() - dayOfWeek);
            const start = new Date(thisWeekStart);
            start.setDate(thisWeekStart.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }

        case 'month': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }

        case 'year': {
            const start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
            const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }

        case 'last7':
        case 'last30':
        case 'last90': {
            const days = dateFilter === 'last7' ? 7 : dateFilter === 'last30' ? 30 : 90;
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 23, 59, 59, 999);
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days * 2 - 1), 0, 0, 0);
            return { startDate: start.toISOString(), endDate: end.toISOString() };
        }

        case 'custom': {
            if (!startDate || !endDate) return {};
            const startMs = new Date(startDate).getTime();
            const endMs = new Date(endDate).getTime();
            const duration = endMs - startMs;
            if (!Number.isFinite(duration) || duration <= 0) return {};
            const priorEnd = new Date(startMs - 1);
            const priorStart = new Date(startMs - duration - 1);
            return { startDate: priorStart.toISOString(), endDate: priorEnd.toISOString() };
        }

        default:
            return {};
    }
}

/**
 * Human-readable label for the current period (e.g. "April 2026", "This week", "Today").
 */
export function periodLabel(dateFilter: DateFilter): string {
    const now = new Date();
    switch (dateFilter) {
        case 'today':
            return 'Today';
        case 'yesterday':
            return 'Yesterday';
        case 'week':
            return 'This week';
        case 'month':
            return now.toLocaleString(undefined, { month: 'long', year: 'numeric' });
        case 'year':
            return String(now.getFullYear());
        case 'last7':
            return 'Last 7 days';
        case 'last30':
            return 'Last 30 days';
        case 'last90':
            return 'Last 90 days';
        case 'custom':
            return 'Custom range';
        case 'all':
        default:
            return 'All time';
    }
}

/** Human-readable label for the *prior* period — used in delta captions. */
export function priorPeriodLabel(dateFilter: DateFilter): string {
    switch (dateFilter) {
        case 'today':
            return 'yesterday';
        case 'yesterday':
            return 'the day before';
        case 'week':
            return 'last week';
        case 'month':
            return 'last month';
        case 'year':
            return 'last year';
        case 'last7':
            return 'the prior 7 days';
        case 'last30':
            return 'the prior 30 days';
        case 'last90':
            return 'the prior 90 days';
        case 'custom':
            return 'the prior range';
        case 'all':
        default:
            return '';
    }
}

/**
 * Converts CalendarDate range to ISO date strings for API calls
 * Used with @internationalized/date CalendarDate objects
 *
 * @param calendarValue - DateRange object with start and end CalendarDate
 * @returns Object with startDate and endDate as ISO strings, or empty object if invalid
 */
export function getDateRangeFromCalendar(calendarValue: {
    start?: { year: number; month: number; day: number };
    end?: { year: number; month: number; day: number };
} | undefined): { startDate?: string; endDate?: string } {
    if (!calendarValue?.start || !calendarValue?.end) return {};

    const start = new Date(calendarValue.start.year, calendarValue.start.month - 1, calendarValue.start.day, 0, 0, 0);
    const end = new Date(calendarValue.end.year, calendarValue.end.month - 1, calendarValue.end.day, 23, 59, 59, 999);

    return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
    };
}

/**
 * Formats an ISO date string to a localized date (without time)
 *
 * @param dateString - ISO date string
 * @param locale - BCP 47 language tag (default: 'en-US')
 * @returns Formatted date string (e.g., "Dec 8, 2025" for en-US, "8 Des 2025" for id-ID)
 *
 * @example
 * formatDate("2025-12-08T10:30:00.000Z") // "Dec 8, 2025" (en-US)
 * formatDate("2025-12-08T10:30:00.000Z", "id-ID") // "8 Des 2025" (Indonesian)
 * formatDate("2025-12-08T10:30:00.000Z", "ja-JP") // "2025/12/8" (Japanese)
 */
export function formatDate(dateString: string, locale: string = 'en-US'): string {
    return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Formats an ISO date string to a localized date and time
 *
 * @param dateString - ISO date string
 * @param locale - BCP 47 language tag (default: 'en-US')
 * @returns Formatted date and time string (e.g., "Dec 8, 2025, 10:30 AM" for en-US)
 *
 * @example
 * formatDateTime("2025-12-08T10:30:00.000Z") // "Dec 8, 2025, 10:30 AM" (en-US)
 * formatDateTime("2025-12-08T10:30:00.000Z", "id-ID") // "8 Des 2025 10.30" (Indonesian)
 * formatDateTime("2025-12-08T10:30:00.000Z", "ja-JP") // "2025/12/8 10:30" (Japanese)
 */
export function formatDateTime(dateString: string, locale: string = 'en-US'): string {
    return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}