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
 * Formats a number as currency using US locale
 *
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export const formatCurrency = (amount: number, decimals = 2): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(amount);
};

/**
 * Date filter types for filtering expenses by time period
 */
export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

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
            return { startDate, endDate };
        }

        default:
            return {};
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
 * @returns Formatted date string (e.g., "Dec 8, 2025")
 */
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Formats an ISO date string to a localized date and time
 *
 * @param dateString - ISO date string
 * @returns Formatted date and time string (e.g., "Dec 8, 2025, 10:30 AM")
 */
export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}