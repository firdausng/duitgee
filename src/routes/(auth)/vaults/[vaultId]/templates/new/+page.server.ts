import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { createExpenseTemplateSchema } from '$lib/schemas/expenseTemplates';

export const load = async ({ params, fetch }) => {
	const vaultId = params.vaultId;

	const form = await superValidate(
		valibot(createExpenseTemplateSchema, {
			defaults: {
				vaultId,
				name: '',
				icon: '📝',
				iconType: 'emoji',
                defaultPaidBy: '__creator__'
			}
		})
	);

	// Fetch vault data (includes members)
	let members: Array<{ userId: string; displayName: string }> = [];
	try {
		const response = await fetch(`/api/getVault?vaultId=${vaultId}`);
		if (response.ok) {
			const result = await response.json();
			if (result.success && result.data) {
				members = result.data.members || [];
			}
		}
	} catch (error) {
		console.error('Failed to fetch vault:', error);
	}

	return {
		form,
		vaultId,
		members
	};
};