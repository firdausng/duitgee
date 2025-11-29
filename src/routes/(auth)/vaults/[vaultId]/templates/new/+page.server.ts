import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { fail, redirect } from '@sveltejs/kit';
import { createExpenseTemplateSchema } from '$lib/schemas/expenseTemplates';

export const load = async ({ params, fetch }) => {
	const vaultId = params.vaultId;

	const form = await superValidate(
		valibot(createExpenseTemplateSchema, {
			defaults: {
				vaultId,
				icon: '📝',
				iconType: 'emoji'
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

export const actions = {
	default: async ({ request, params, fetch }) => {
		const form = await superValidate(request, valibot(createExpenseTemplateSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const response = await fetch('/api/createExpenseTemplate', {
				method: 'POST',
				body: JSON.stringify(form.data),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error('Failed to create template');
			}

			// Redirect back to the expense creation flow
			return redirect(303, `/vaults/${params.vaultId}/expenses/new`);
		} catch (error) {
			console.error('Failed to create template:', error);
			return fail(500, {
				form,
				error: 'Failed to create template. Please try again.'
			});
		}
	}
};
