import { error } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateBudgetSchema } from '$lib/schemas/budgets';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, fetch, locals }) => {
	const vaultId = params.vaultId;
	const budgetId = params.budgetId;

	// Fetch budget data
	let budget = null;
	try {
		const response = await fetch(`/api/getBudget?vaultId=${vaultId}&id=${budgetId}`);
		if (!response.ok) {
			throw error(404, 'Budget not found');
		}

		const result = await response.json();
		if (!result.success) {
			throw error(404, 'Budget not found');
		}

		budget = result.data;
	} catch (err) {
		console.error('Failed to fetch budget:', err);
		throw error(404, 'Budget not found');
	}

	// Note: date conversion to local time must happen on the client side
	const formData = {
		id: budget.id,
		vaultId: budget.vaultId,
		name: budget.name,
		description: budget.description,
		amount: budget.amount,
		period: budget.period,
		startDate: '', // Will be set on client side from budgetStartDateUtc
		endDate: null as string | null, // Will be set on client side from budgetEndDateUtc
		categoryNames: budget.categoryNames,
		templateIds: budget.templateIds,
		userIds: budget.userIds,
		alertThreshold: budget.alertThreshold,
		alertEnabled: budget.alertEnabled,
		isActive: budget.isActive
	};

	const form = await superValidate(formData, valibot(updateBudgetSchema));

	// Fetch vault data (includes members)
	let members: Array<{ userId: string; displayName: string }> = [];
	let vault = null;
	try {
		const response = await fetch(`/api/getVault?vaultId=${vaultId}`);
		if (response.ok) {
			const result = await response.json();
			if (result.success && result.data) {
				members = result.data.members || [];
				vault = result.data.vaults;
			}
		}
	} catch (error) {
		console.error('Failed to fetch vault:', error);
	}

	// Fetch templates for the vault
	let templates: Array<{ id: string; name: string; icon: string | null }> = [];
	try {
		const response = await fetch(`/api/getExpenseTemplates?vaultId=${vaultId}`);
		if (response.ok) {
			const result = await response.json();
			if (result.success && result.data) {
				templates = result.data.templates || [];
			}
		}
	} catch (error) {
		console.error('Failed to fetch templates:', error);
	}

	return {
		form,
		vaultId,
		budgetId,
		budget,
		budgetStartDateUtc: budget.startDate, // Pass raw UTC date to client
		budgetEndDateUtc: budget.endDate, // Pass raw UTC date to client
		members,
		templates,
		vault
	};
};
