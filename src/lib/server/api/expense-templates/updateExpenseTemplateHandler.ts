import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenseTemplates } from '$lib/server/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import type { UpdateExpenseTemplate } from '$lib/schemas/expenseTemplates';
import { updateAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';

export const updateExpenseTemplate = async (
	session: App.AuthSession,
	data: UpdateExpenseTemplate,
	env: Cloudflare.Env
) => {
	const client = drizzle(env.DB, { schema });
	const { id, vaultId, defaultTagIds, ...updateData } = data;
	// JSON-encode the tag list when provided. undefined leaves the column untouched.
	const tagIdsValue = defaultTagIds === undefined
		? undefined
		: defaultTagIds.length > 0
			? JSON.stringify(Array.from(new Set(defaultTagIds)))
			: null;

	// Check if user has permission to edit templates in this vault
	await requireVaultPermission(session, vaultId, 'canEditExpenses', env);

	// Check if template exists
	const existingTemplate = await client
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

	if (!existingTemplate || existingTemplate.length === 0) {
		throw new Error('Template not found');
	}

	// Update the template
	const [updatedTemplate] = await client
		.update(expenseTemplates)
		.set({
			...updateData,
			...(tagIdsValue !== undefined ? { defaultTagIds: tagIdsValue } : {}),
			...updateAuditFields({ userId: session.user.id })
		})
		.where(eq(expenseTemplates.id, id))
		.returning();

	return updatedTemplate;
};
