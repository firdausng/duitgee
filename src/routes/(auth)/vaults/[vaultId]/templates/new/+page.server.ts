import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { createExpenseTemplateSchema } from '$lib/schemas/expenseTemplates';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { getFunds } from '$lib/server/api/funds/getFundsHandler';
import { getTags } from '$lib/server/api/tags/getTagsHandler';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (platform === undefined) throw new Error('No platform');
	if (!locals.currentUser) throw error(401, 'Unauthorized');

	const vaultId = params.vaultId;
	const session = locals.currentSession;
	const env = platform.env;

	const form = await superValidate(
		valibot(createExpenseTemplateSchema, {
			defaults: {
				vaultId,
				name: '',
				icon: '📝',
				iconType: 'emoji',
				defaultPaidBy: '__creator__',
			},
		}),
	);

	// Fire all three reads in parallel — independent direct handler calls.
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

	return {
		form,
		vaultId,
		members,
		funds,
		tags,
	};
};
