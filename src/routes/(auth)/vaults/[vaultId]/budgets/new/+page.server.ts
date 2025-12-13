import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { createBudgetSchema } from '$lib/schemas/budgets';

export const load = async ({ params, platform, fetch, locals }) => {
	const vaultId = params.vaultId;
	const currentUserId = locals.currentUser?.id || '';

	const form = await superValidate(
		valibot(createBudgetSchema, {
			defaults: {
				vaultId: vaultId,
				amount: 0,
				period: 'monthly',
				alertThreshold: 80,
				alertEnabled: true,
				isActive: true
			}
		})
	);

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
		members,
		templates,
		vault
	};
};
