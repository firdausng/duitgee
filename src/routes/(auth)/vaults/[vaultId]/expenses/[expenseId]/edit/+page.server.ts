import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateExpenseRequestSchema } from '$lib/schemas/expenses';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExpense } from '$lib/server/api/expenses/getExpenseHandler';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { getFunds } from '$lib/server/api/funds/getFundsHandler';
import { getTags } from '$lib/server/api/tags/getTagsHandler';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (platform === undefined) throw new Error('No platform');
	if (!locals.currentUser) throw error(401, 'Unauthorized');

	const vaultId = params.vaultId;
	const expenseId = params.expenseId;
	const session = locals.currentSession;
	const env = platform.env;

	// Expense first — if missing, no point loading the rest. The other 3 reads
	// are independent and run in parallel below.
	const expenseData = await getExpense(vaultId, expenseId, env).catch((err) => {
		console.error('Failed to load expense:', err);
		return undefined;
	});

	if (!expenseData) throw error(404, 'Expense not found');

	const [vaultResult, fundRows, tagRows] = await Promise.all([
		getVault(session, vaultId, env).catch((err) => {
			console.error('Failed to load vault:', err);
			return null;
		}),
		getFunds(vaultId, session, env).catch((err) => {
			console.error('Failed to load funds:', err);
			return [];
		}),
		getTags(session, vaultId, env).catch((err) => {
			console.error('Failed to load tags:', err);
			return [];
		}),
	]);

	const members: Array<{ userId: string; displayName: string }> = (vaultResult?.members ?? []).map((m) => ({
		userId: m.userId,
		displayName: m.displayName,
	}));

	const funds: Array<{ id: string; name: string; balance: number }> = (fundRows ?? [])
		.map((row: any) => row.fund)
		.filter((f: any) => f.status === 'active');

	const tags: Array<{ id: string; name: string; color: string | null }> = (tagRows ?? []).map((t) => ({
		id: t.id,
		name: t.name,
		color: t.color ?? null,
	}));

	const expenseTagIds: string[] = (expenseData.tags ?? []).map((t: { id: string }) => t.id);
	const expenseAttachmentIds: string[] = (expenseData.attachments ?? []).map(
		(a: { id: string }) => a.id,
	);

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
			attachmentIds: expenseAttachmentIds,
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
