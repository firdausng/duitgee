import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateExpenseRequestSchema } from '$lib/schemas/expenses';
import { error } from '@sveltejs/kit';

export const load = async ({ params, fetch }) => {
	const vaultId = params.vaultId;
	const expenseId = params.expenseId;

	// Fetch expense data
	let expenseData;
	try {
		const expenseResponse = await fetch(
			`/api/getExpense?vaultId=${vaultId}&id=${expenseId}`
		);
		if (!expenseResponse.ok) {
			throw error(404, 'Expense not found');
		}
		const expenseResult = await expenseResponse.json();
		if (!expenseResult.success || !expenseResult.data) {
			throw error(404, 'Expense not found');
		}
		expenseData = expenseResult.data;
	} catch (err) {
		console.error('Failed to fetch expense:', err);
		throw error(404, 'Expense not found');
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

	// Fetch all tags in this vault for the picker
	let tags: Array<{ id: string; name: string; color: string | null }> = [];
	try {
		const response = await fetch(`/api/getTags?vaultId=${vaultId}`);
		if (response.ok) {
			const result = (await response.json()) as { success: boolean; data: any[] };
			if (result.success) {
				tags = result.data ?? [];
			}
		}
	} catch {
		// non-critical — tag picker will start empty
	}

	const expenseTagIds: string[] = (expenseData.tags ?? []).map((t: { id: string }) => t.id);

	// Initialize form with expense data
	// Note: date conversion to local time must happen on the client side
	const form = await superValidate(
		{
			id: expenseData.id,
			vaultId: vaultId,
			note: expenseData.note,
			amount: expenseData.amount,
			categoryName: expenseData.category?.name || '',
			paidBy: expenseData.paidBy,
			paymentType: expenseData.paymentType,
			date: '', // Will be set on client side from expenseDateUtc
			fundId: expenseData.fundId ?? null,
			fundPaymentMode: expenseData.fundPaymentMode ?? null,
			tagIds: expenseTagIds,
		},
		valibot(updateExpenseRequestSchema)
	);

	return {
		form,
		vaultId,
		expenseId,
		expense: expenseData,
		expenseDateUtc: expenseData.date, // Pass raw UTC date to client
		members,
		funds,
		tags,
	};
};
