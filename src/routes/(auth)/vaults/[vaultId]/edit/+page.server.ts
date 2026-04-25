import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { updateVaultRequestSchema } from "$lib/schemas/vaults";
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (platform === undefined) throw new Error('No platform');
	if (!locals.currentUser) throw error(401, 'Unauthorized');

	const vaultId = params.vaultId;

	const vaultData = await getVault(locals.currentSession, vaultId, platform.env).catch((err) => {
		console.error({ message: 'Failed to load vault', err });
		return null;
	});

	if (!vaultData) throw error(404, 'Vault not found');

	const form = await superValidate(
		{
			id: vaultData.vaults.id,
			name: vaultData.vaults.name,
			description: vaultData.vaults.description,
			color: vaultData.vaults.color,
			icon: vaultData.vaults.icon,
			iconType: vaultData.vaults.iconType,
			isDefault: vaultData.vaults.isDefault,
			locale: vaultData.vaults.locale || 'en-US',
			currency: vaultData.vaults.currency || 'USD',
		},
		valibot(updateVaultRequestSchema)
	);

	return {
		form,
		vaultId,
		vault: vaultData,
	};
};
