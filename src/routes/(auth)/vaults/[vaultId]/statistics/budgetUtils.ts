import { parseISO, differenceInDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import type { Expense } from '../types';

export type Budget = {
	id: string;
	name: string;
	amount: number;
	period: 'weekly' | 'monthly' | 'custom';
	startDate: string;
	endDate: string | null;
	categoryNames: string[] | null;
	templateIds: string[] | null;
	userIds: string[] | null;
	alertThreshold: number;
	isActive: boolean;
};

export type BudgetProgress = {
	budget: Budget;
	totalSpent: number;
	remaining: number;
	percentageUsed: number;
	daysElapsed: number;
	totalDays: number;
	daysRemaining: number;
	dailyPace: number;
	expectedSpendingByNow: number;
	status: 'under' | 'warning' | 'over' | 'exceeded';
	isOnTrack: boolean;
};

/**
 * Calculate the date range for a budget based on its period
 */
export function getBudgetDateRange(budget: Budget, referenceDate: Date = new Date()): { start: Date; end: Date } {
	const budgetStart = parseISO(budget.startDate);

	if (budget.period === 'custom' && budget.endDate) {
		return {
			start: budgetStart,
			end: parseISO(budget.endDate)
		};
	}

	// For weekly and monthly periods, calculate the current period based on start date
	const daysSinceStart = differenceInDays(startOfDay(referenceDate), startOfDay(budgetStart));

	if (budget.period === 'weekly') {
		const weekNumber = Math.floor(daysSinceStart / 7);
		const periodStart = new Date(budgetStart);
		periodStart.setDate(budgetStart.getDate() + (weekNumber * 7));

		const periodEnd = new Date(periodStart);
		periodEnd.setDate(periodStart.getDate() + 6);
		periodEnd.setHours(23, 59, 59, 999);

		return { start: periodStart, end: periodEnd };
	}

	if (budget.period === 'monthly') {
		const monthsSinceStart =
			(referenceDate.getFullYear() - budgetStart.getFullYear()) * 12 +
			(referenceDate.getMonth() - budgetStart.getMonth());

		const periodStart = new Date(budgetStart);
		periodStart.setMonth(budgetStart.getMonth() + monthsSinceStart);

		const periodEnd = new Date(periodStart);
		periodEnd.setMonth(periodStart.getMonth() + 1);
		periodEnd.setDate(periodStart.getDate() - 1);
		periodEnd.setHours(23, 59, 59, 999);

		return { start: periodStart, end: periodEnd };
	}

	// Fallback
	return { start: budgetStart, end: referenceDate };
}

/**
 * Filter expenses that match the budget's criteria
 * Supports multiple categories, templates, and users
 */
export function filterExpensesForBudget(expenses: Expense[], budget: Budget): Expense[] {
	return expenses.filter(expense => {
		// Filter by categories - expense must match ANY of the selected categories
		if (budget.categoryNames && budget.categoryNames.length > 0) {
			if (!expense.category?.name || !budget.categoryNames.includes(expense.category.name)) {
				return false;
			}
		}

		// Filter by templates - expense must match ANY of the selected templates
		if (budget.templateIds && budget.templateIds.length > 0) {
			if (!expense.templateId || !budget.templateIds.includes(String(expense.templateId))) {
				return false;
			}
		}

		// Filter by users - expense must be paid by ANY of the selected users
		if (budget.userIds && budget.userIds.length > 0) {
			if (!expense.paidBy || !budget.userIds.includes(expense.paidBy)) {
				return false;
			}
		}

		return true;
	});
}

/**
 * Calculate budget progress for the current period
 */
export function calculateBudgetProgress(
	budget: Budget,
	expenses: Expense[],
	referenceDate: Date = new Date()
): BudgetProgress {
	// Get the current budget period
	const { start, end } = getBudgetDateRange(budget, referenceDate);

	// Filter expenses within the budget period
	const periodExpenses = expenses.filter(expense => {
		const expenseDate = parseISO(expense.date);
		return isWithinInterval(expenseDate, { start, end });
	});

	// Filter expenses by budget criteria
	const budgetExpenses = filterExpensesForBudget(periodExpenses, budget);

	// Calculate totals
	const totalSpent = budgetExpenses.reduce((sum, expense) => sum + expense.amount, 0);
	const remaining = budget.amount - totalSpent;
	const percentageUsed = (totalSpent / budget.amount) * 100;

	// Calculate time-based metrics
	const totalDays = differenceInDays(endOfDay(end), startOfDay(start)) + 1;
	const daysElapsed = Math.min(
		differenceInDays(startOfDay(referenceDate), startOfDay(start)) + 1,
		totalDays
	);
	const daysRemaining = Math.max(totalDays - daysElapsed, 0);

	// Calculate expected spending based on time elapsed
	const dailyPace = budget.amount / totalDays;
	const expectedSpendingByNow = dailyPace * daysElapsed;

	// Determine status
	let status: 'under' | 'warning' | 'over' | 'exceeded' = 'under';
	const progressVsPace = (totalSpent / expectedSpendingByNow) * 100;

	if (totalSpent >= budget.amount) {
		status = 'exceeded';
	} else if (progressVsPace >= 100) {
		status = 'over';
	} else if (progressVsPace >= budget.alertThreshold) {
		status = 'warning';
	}

	const isOnTrack = status === 'under';

	return {
		budget,
		totalSpent,
		remaining,
		percentageUsed,
		daysElapsed,
		totalDays,
		daysRemaining,
		dailyPace,
		expectedSpendingByNow,
		status,
		isOnTrack
	};
}

/**
 * Get color class for budget status
 */
export function getBudgetStatusColor(status: 'under' | 'warning' | 'over' | 'exceeded'): string {
	switch (status) {
		case 'under':
			return 'bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300';
		case 'warning':
			return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-700 dark:text-yellow-300';
		case 'over':
		case 'exceeded':
			return 'bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-300';
		default:
			return 'bg-muted border-border text-foreground';
	}
}

/**
 * Calculate budget status for a specific day
 */
export function getDayBudgetStatus(
	date: Date,
	budget: Budget,
	expenses: Expense[]
): 'under' | 'warning' | 'over' | null {
	const { start, end } = getBudgetDateRange(budget, date);

	// Check if date is within budget period
	if (!isWithinInterval(date, { start, end })) {
		return null;
	}

	// Get expenses up to this date
	const expensesUpToDate = expenses.filter(expense => {
		const expenseDate = parseISO(expense.date);
		return isWithinInterval(expenseDate, { start, end }) &&
			expenseDate <= endOfDay(date);
	});

	// Filter by budget criteria
	const budgetExpenses = filterExpensesForBudget(expensesUpToDate, budget);
	const spentSoFar = budgetExpenses.reduce((sum, expense) => sum + expense.amount, 0);

	// Calculate expected spending by this date
	const totalDays = differenceInDays(endOfDay(end), startOfDay(start)) + 1;
	const daysElapsed = differenceInDays(endOfDay(date), startOfDay(start)) + 1;
	const dailyPace = budget.amount / totalDays;
	const expectedByNow = dailyPace * daysElapsed;

	// Determine status
	const progressVsPace = (spentSoFar / expectedByNow) * 100;

	if (progressVsPace >= 100) {
		return 'over';
	} else if (progressVsPace >= budget.alertThreshold) {
		return 'warning';
	}

	return 'under';
}
