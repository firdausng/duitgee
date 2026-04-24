import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenseTemplates } from '$lib/server/db/schema';
import { eq, isNull, and, desc, asc } from 'drizzle-orm';
import type { ListExpenseTemplatesQuery } from '$lib/schemas/expenseTemplates';
import { getUserVaultRole } from '$lib/server/utils/vaultPermissions';

export const getExpenseTemplates = async (
	session: App.AuthSession,
	query: ListExpenseTemplatesQuery,
	env: Cloudflare.Env
) => {
	const client = drizzle(env.DB, { schema });
	const { vaultId } = query;

	// Any active vault member can read templates
	const role = await getUserVaultRole(session.user.id, vaultId, env);
	if (!role) {
		throw new Error('You do not have access to this vault');
	}

	// Get all non-deleted templates for this vault
	// Order by: most recently used first, then by newest created
	const templates = await client
		.select()
		.from(expenseTemplates)
		.where(
			and(
				eq(expenseTemplates.vaultId, vaultId),
				isNull(expenseTemplates.deletedAt)
			)
		)
		.orderBy(desc(expenseTemplates.lastUsedAt), desc(expenseTemplates.createdAt));

	return { templates };
};
