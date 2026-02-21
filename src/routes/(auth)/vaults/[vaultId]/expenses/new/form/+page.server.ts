import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { createExpenseSchema } from '$lib/schemas/expenses';

export const load = async ({ params, url, platform, fetch, locals }) => {
	const vaultId = params.vaultId;
	const templateId = url.searchParams.get('templateId');
	const currentUserId = locals.currentUser?.id || '';

	const form = await superValidate(
		valibot(createExpenseSchema, {
			defaults: {
				vaultId,
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
					// Replace __creator__ with current user ID
					if (template.defaultPaidBy === '__creator__') {
						form.data.paidBy = currentUserId;
					} else {
						form.data.paidBy = template.defaultPaidBy || '';
					}
					form.data.fundId = template.defaultFundId ?? null;
					form.data.fundPaymentMode = template.defaultFundPaymentMode ?? null;
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

	// Fetch active funds for fund selector
	let funds: Array<{ id: string; name: string; balance: number }> = [];
	try {
		const response = await fetch(`/api/getFunds?vaultId=${vaultId}`);
		if (response.ok) {
			const result = await response.json();
			if (result.success) {
				funds = (result.data ?? [])
					.map((row: any) => row.fund)
					.filter((f: any) => f.status === 'active');
			}
		}
	} catch {
		// non-critical — fund selector will be empty
	}

	return {
		form,
		vaultId,
		template,
		members,
		funds,
	};
};

