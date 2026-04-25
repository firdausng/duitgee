import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateExpenseTemplateSchema } from '$lib/schemas/expenseTemplates';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExpenseTemplate } from '$lib/server/api/expense-templates/getExpenseTemplateHandler';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { getFunds } from '$lib/server/api/funds/getFundsHandler';
import { getTags } from '$lib/server/api/tags/getTagsHandler';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (platform === undefined) throw new Error('No platform');
	if (!locals.currentUser) throw error(401, 'Unauthorized');

	const vaultId = params.vaultId;
	const templateId = params.templateId;
	const session = locals.currentSession;
	const env = platform.env;

	// Fire all four reads in parallel — they're independent. Each is a direct
	// handler call (no self-fetch overhead, no auth re-validation, no JSON
	// serialize/parse round-trip).
	const [templateData, vaultResult, fundRows, tagRows] = await Promise.all([
		getExpenseTemplate(session, { vaultId, id: templateId }, env).catch((err) => {
			console.error('Failed to load template:', err);
			return null;
		}),
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

	if (!templateData) throw error(404, 'Template not found');

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

	// getExpenseTemplate returns defaultTagIds + categoryNames parsed into string[]
	const templateTagIds: string[] = Array.isArray(templateData.defaultTagIds)
		? templateData.defaultTagIds
		: [];
	const templateCategoryNames: string[] = Array.isArray(templateData.categoryNames)
		? templateData.categoryNames
		: templateData.defaultCategoryName
			? [templateData.defaultCategoryName]
			: [];

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
			categoryNames: templateCategoryNames,
			defaultPaidBy: templateData.defaultPaidBy,
			defaultFundId: templateData.defaultFundId ?? null,
			defaultFundPaymentMode: templateData.defaultFundPaymentMode ?? null,
			defaultTagIds: templateTagIds,
		},
		valibot(updateExpenseTemplateSchema)
	);

	return {
		form,
		vaultId,
		templateId,
		template: templateData,
		members,
		funds,
		tags,
	};
};
