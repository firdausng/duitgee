import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenseTemplates } from '$lib/server/db/schema';
import { eq, isNull, and, desc, asc } from 'drizzle-orm';
import type { ListExpenseTemplatesQuery } from '$lib/schemas/expenseTemplates';
import { checkVaultPermission } from '$lib/server/utils/vaultPermissions';

export const getExpenseTemplates = async (
	session: App.AuthSession,
	query: ListExpenseTemplatesQuery,
	env: Cloudflare.Env
) => {
	const client = drizzle(env.DB, { schema });
	const { vaultId } = query;

	// Check if user is a member of this vault
	const hasAccess = await checkVaultPermission(session.user.id, vaultId, 'canEditExpenses', env);
	if (!hasAccess) {
		throw new Error('You do not have access to this vault');
	}

	// Get all non-deleted templates for this vault
	const templates = await client
		.select()
		.from(expenseTemplates)
		.where(
			and(
				eq(expenseTemplates.vaultId, vaultId),
				isNull(expenseTemplates.deletedAt)
			)
		)
		.orderBy(desc(expenseTemplates.updatedAt), asc(expenseTemplates.name));

	return { templates };
};
