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
		// non-critical
	}

	// Fetch tags for the picker
	let tags: Array<{ id: string; name: string; color: string | null }> = [];
	try {
		const response = await fetch(`/api/getTags?vaultId=${vaultId}`);
		if (response.ok) {
			const result: any = await response.json();
			if (result.success) tags = result.data ?? [];
		}
	} catch {
		// non-critical
	}

	return {
		form,
		vaultId,
		members,
		funds,
		tags,
	};
};