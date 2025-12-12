import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {CreateBudgetRequest} from "$lib/schemas/budgets";
import {budgets} from "$lib/server/db/schema";
import {requireVaultPermission} from "$lib/server/utils/vaultPermissions";
import {initialAuditFields} from "$lib/server/utils/audit";

export const createBudget = async (
    session: App.AuthSession,
    data: CreateBudgetRequest,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    // Check permission - only owner/admin can create budgets
    await requireVaultPermission(session, data.vaultId, 'canEditVault', env);

    // Validate custom period has end date
    if (data.period === 'custom' && !data.endDate) {
        throw new Error('End date is required for custom budget period');
    }

    // Create budget
    const [newBudget] = await client
        .insert(budgets)
        .values({
            vaultId: data.vaultId,
            name: data.name,
            description: data.description || null,
            amount: data.amount,
            period: data.period,
            startDate: data.startDate,
            endDate: data.endDate || null,
            categoryName: data.categoryName || null,
            templateId: data.templateId || null,
            userId: data.userId || null,
            alertThreshold: data.alertThreshold || 80,
            alertEnabled: data.alertEnabled !== undefined ? data.alertEnabled : true,
            isActive: true,
            ...initialAuditFields({ userId: session.user.id })
        })
        .returning();

    return newBudget;
};
