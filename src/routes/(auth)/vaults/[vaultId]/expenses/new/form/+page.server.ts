import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { createExpenseSchema } from '$lib/schemas/expenses';
import { UTCDate } from '@date-fns/utc';

export const load = async ({ params, url, platform, fetch }) => {
	const vaultId = params.vaultId;
	const templateId = url.searchParams.get('templateId');

	// Initialize form with vaultId and current date in YYYY-MM-DD format for date input
	const today = new UTCDate();
	const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

	const form = await superValidate(
		valibot(createExpenseSchema, {
			defaults: {
				vaultId,
				date: dateString,
				amount: 0
			}
		})
	);

	// If templateId is provided, fetch template and pre-populate form
	let template = null;
	if (templateId) {
		try {
			const response = await fetch(
				`/api/getExpenseTemplate?vaultId=${vaultId}&id=${templateId}`
			);

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					template = result.data;
					// Pre-populate form with template defaults
					form.data.note = template.defaultNote || '';
					form.data.amount = template.defaultAmount || 0;
					form.data.categoryName = template.defaultCategoryName || '';
					form.data.paidBy = template.defaultPaidBy || '';
					form.data.templateId = templateId;
				}
			}
		} catch (error) {
			console.error('Failed to fetch template:', error);
		}
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
	} catch (error) {
		console.error('Failed to fetch vault:', error);
	}

	return {
		form,
		vaultId,
		template,
		members
	};
};

