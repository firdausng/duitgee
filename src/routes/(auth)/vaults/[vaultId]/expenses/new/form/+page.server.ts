import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { sharedExpenseDefaultsSchema } from '$lib/schemas/expenses';

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

export const load = async ({ params, url, fetch, locals }) => {
	const vaultId = params.vaultId;
	const templateId = url.searchParams.get('templateId');
	const currentUserId = locals.currentUser?.id || '';
	const returnTo = validateReturnTo(url.searchParams.get('returnTo'), vaultId);

	// If templateId is provided, fetch template and pre-populate shared defaults
	let template = null;
	if (templateId) {
		try {
			const response = await fetch(
				`/api/getExpenseTemplate?vaultId=${vaultId}&id=${templateId}`
			);

			if (response.ok) {
				const result: any = await response.json();
				if (result.success) {
					template = result.data;
					// Resolve __creator__ placeholder
					if (template.defaultPaidBy === '__creator__') {
						template.defaultPaidBy = currentUserId;
					}
				}
			}
		} catch (error) {
			console.error('Failed to fetch template:', error);
		}
	}

	// Initialize superForm for shared defaults, pre-populated from template if available
	const form = await superValidate(
		valibot(sharedExpenseDefaultsSchema, {
			defaults: {
				paymentType: template?.defaultPaymentType ?? 'cash',
				date: '',
				paidBy: template?.defaultPaidBy ?? null,
				fundId: template?.defaultFundId ?? null,
				fundPaymentMode: template?.defaultFundPaymentMode ?? null,
			}
		})
	);

	// Fetch vault data (includes members)
	let members: Array<{ userId: string; displayName: string }> = [];
	try {
		const response = await fetch(`/api/getVault?vaultId=${vaultId}`);
		if (response.ok) {
			const result: any = await response.json();
			if (result.success && result.data) {
				members = result.data.members || [];
			}
		}
	} catch (error) {
		console.error('Failed to fetch vault:', error);
	}

	// Fetch active funds for fund selector
	let funds: Array<{ id: string; name: string; balance: number; icon?: string }> = [];
	try {
		const response = await fetch(`/api/getFunds?vaultId=${vaultId}`);
		if (response.ok) {
			const result: any = await response.json();
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
		templateId,
		members,
		funds,
		currentUserId,
		returnTo,
	};
};
