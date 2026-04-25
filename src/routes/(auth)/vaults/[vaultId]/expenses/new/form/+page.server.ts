import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { sharedExpenseDefaultsSchema } from '$lib/schemas/expenses';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExpenseTemplate } from '$lib/server/api/expense-templates/getExpenseTemplateHandler';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { getFunds } from '$lib/server/api/funds/getFundsHandler';
import { getTags } from '$lib/server/api/tags/getTagsHandler';

/**
 * Validate a `returnTo` query param to prevent open-redirect vectors.
 * Only allow same-origin paths that are scoped to the current vault —
 * anything else falls back to the vault home.
 */
function validateReturnTo(raw: string | null, vaultId: string): string {
	const fallback = `/vaults/${vaultId}`;
	if (!raw) return fallback;
	// Must be a relative path (no protocol, no host, no protocol-relative).
	if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
	// Must stay within this vault's namespace OR be the vaults list.
	if (raw === '/vaults' || raw.startsWith(`/vaults/${vaultId}`)) return raw;
	return fallback;
}

export const load: PageServerLoad = async ({ params, url, locals, platform }) => {
	if (platform === undefined) throw new Error('No platform');
	if (!locals.currentUser) throw error(401, 'Unauthorized');

	const vaultId = params.vaultId;
	const templateId = url.searchParams.get('templateId');
	const currentUserId = locals.currentUser?.id || '';
	const returnTo = validateReturnTo(url.searchParams.get('returnTo'), vaultId);
	const session = locals.currentSession;
	const env = platform.env;

	// All four reads can run in parallel — they're independent. Each is a direct
	// handler call (no self-fetch overhead, no auth re-validation).
	const [templateResult, vaultResult, fundRows, tagRows] = await Promise.all([
		templateId
			? getExpenseTemplate(session, { vaultId, id: templateId }, env).catch((err) => {
					console.error('Failed to load template:', err);
					return null;
			  })
			: Promise.resolve(null),
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

	let template: any = templateResult;
	if (template && template.defaultPaidBy === '__creator__') {
		template = { ...template, defaultPaidBy: currentUserId };
	}

	// getExpenseTemplate already parses defaultTagIds into string[] for clients.
	const templateTagIds: string[] = Array.isArray(template?.defaultTagIds)
		? template.defaultTagIds
		: [];

	// Initialize superForm for shared defaults, pre-populated from template if available
	const form = await superValidate(
		valibot(sharedExpenseDefaultsSchema, {
			defaults: {
				paymentType: template?.defaultPaymentType ?? 'cash',
				date: '',
				paidBy: template?.defaultPaidBy ?? null,
				fundId: template?.defaultFundId ?? null,
				fundPaymentMode: template?.defaultFundPaymentMode ?? null,
				tagIds: templateTagIds,
			}
		})
	);

	const members: Array<{ userId: string; displayName: string }> = (vaultResult?.members ?? []).map((m) => ({
		userId: m.userId,
		displayName: m.displayName,
	}));

	const funds: Array<{ id: string; name: string; balance: number; icon?: string }> = (fundRows ?? [])
		.map((row: any) => row.fund)
		.filter((f: any) => f.status === 'active');

	const tags: Array<{ id: string; name: string; color: string | null }> = (tagRows ?? []).map((t) => ({
		id: t.id,
		name: t.name,
		color: t.color ?? null,
	}));

	const vault = vaultResult?.vaults
		? {
				currency: vaultResult.vaults.currency || 'USD',
				locale: vaultResult.vaults.locale || 'en-US',
		  }
		: null;

	return {
		form,
		vaultId,
		vault,
		template,
		templateId,
		members,
		funds,
		tags,
		currentUserId,
		returnTo,
	};
};
