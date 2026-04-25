import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { expenseTemplates } from '$lib/server/db/schema';
import type { CreateExpenseTemplate } from '$lib/schemas/expenseTemplates';
import { createAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';

export const createExpenseTemplate = async (
	session: App.AuthSession,
	data: CreateExpenseTemplate,
	env: Cloudflare.Env
) => {
	const client = drizzle(env.DB, { schema });

    try {
        //TODO this is just temporary, should just create another api for app admin. this endpoint should check user with vault permission
        if(session.user.role !== 'admin'){
            // Check if user has permission to create templates in this vault
            await requireVaultPermission(session, data.vaultId, 'canCreateExpenses', env);
        }

        const { defaultTagIds, categoryNames, defaultCategoryName, ...rest } = data;

        // Multi-cat support: when categoryNames is provided and non-empty,
        // store as JSON and force defaultCategoryName = categoryNames[0] so
        // automated flows (recurring expenses) keep using a single canonical category.
        const dedupedCategories = categoryNames
            ? Array.from(new Set(categoryNames.filter((c) => c && c.length > 0)))
            : [];
        const categoryNamesJson = dedupedCategories.length > 0
            ? JSON.stringify(dedupedCategories)
            : null;
        const effectiveDefaultCategory = dedupedCategories.length > 0
            ? dedupedCategories[0]
            : defaultCategoryName;

        const [template] = await client
            .insert(expenseTemplates)
            .values({
                ...rest,
                defaultCategoryName: effectiveDefaultCategory,
                categoryNames: categoryNamesJson,
                defaultTagIds: defaultTagIds && defaultTagIds.length > 0
                    ? JSON.stringify(Array.from(new Set(defaultTagIds)))
                    : null,
                userId: session.user.id,
                ...createAuditFields({ userId: session.user.id })
            })
            .returning();

        return template;
    }catch (e) {
        console.log(e);
    }

};
