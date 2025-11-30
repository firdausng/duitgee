import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateExpenseTemplateSchema } from '$lib/schemas/expenseTemplates';
import { error } from '@sveltejs/kit';

export const load = async ({ params, fetch }) => {
	const vaultId = params.vaultId;
	const templateId = params.templateId;

	// Fetch template data
	let templateData;
	try {
		const templateResponse = await fetch(
			`/api/getExpenseTemplate?vaultId=${vaultId}&id=${templateId}`
		);
		if (!templateResponse.ok) {
			throw error(404, 'Template not found');
		}
		const templateResult = await templateResponse.json();
		if (!templateResult.success || !templateResult.data) {
			throw error(404, 'Template not found');
		}
		templateData = templateResult.data;
	} catch (err) {
		console.error('Failed to fetch template:', err);
		throw error(404, 'Template not found');
	}

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
	} catch (err) {
		console.error('Failed to fetch vault:', err);
	}

	// Initialize form with template data
	const form = await superValidate(
		{
			id: templateData.id,
			vaultId: templateData.vaultId,
			name: templateData.name,
			description: templateData.description,
			icon: templateData.icon,
			iconType: templateData.iconType,
			defaultNote: templateData.defaultNote,
			defaultAmount: templateData.defaultAmount,
			defaultCategoryName: templateData.defaultCategoryName,
			defaultPaidBy: templateData.defaultPaidBy
		},
		valibot(updateExpenseTemplateSchema)
	);

	return {
		form,
		vaultId,
		templateId,
		template: templateData,
		members
	};
};
