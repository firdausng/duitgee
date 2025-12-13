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

        const [template] = await client
            .insert(expenseTemplates)
            .values({
                ...data,
                userId: session.user.id,
                ...createAuditFields({ userId: session.user.id })
            })
            .returning();

        return template;
    }catch (e) {
        console.log(e);
    }

};
