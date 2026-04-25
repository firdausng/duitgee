import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenseTemplates } from '$lib/server/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import type { GetExpenseTemplateQuery } from '$lib/schemas/expenseTemplates';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';

export const getExpenseTemplate = async (
	session: App.AuthSession,
	query: GetExpenseTemplateQuery,
	env: Cloudflare.Env
) => {
	const client = drizzle(env.DB, { schema });
	const { vaultId, id } = query;

	// Any active vault member can read templates
	const role = await getUserVaultRole(session.user.id, vaultId, env);
	if (!role) {
		throw new Error('You do not have access to this vault');
	}

	// Get the template
	const template = await client
		.select()
		.from(expenseTemplates)
		.where(
			and(
				eq(expenseTemplates.id, id),
				eq(expenseTemplates.vaultId, vaultId),
				isNull(expenseTemplates.deletedAt)
			)
		)
		.limit(1);

	if (!template || template.length === 0) {
		throw new Error('Template not found');
	}

	// Parse JSON-encoded array columns into real arrays for clients.
	const row = template[0];
	let defaultTagIds: string[] = [];
	if (row.defaultTagIds) {
		try {
			const parsed = JSON.parse(row.defaultTagIds);
			if (Array.isArray(parsed)) defaultTagIds = parsed.filter((id) => typeof id === 'string');
		} catch {
			// ignore malformed JSON
		}
	}
	let categoryNames: string[] = [];
	if (row.categoryNames) {
		try {
			const parsed = JSON.parse(row.categoryNames);
			if (Array.isArray(parsed)) categoryNames = parsed.filter((c) => typeof c === 'string');
		} catch {
			// ignore malformed JSON
		}
	}

	return { ...row, defaultTagIds, categoryNames };
};
