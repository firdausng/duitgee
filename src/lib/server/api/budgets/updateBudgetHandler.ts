import {drizzle} from "drizzle-orm/d1";
import * as schema from "$lib/server/db/schema";
import type {UpdateBudgetRequest} from "$lib/schemas/budgets";
import {budgets} from "$lib/server/db/schema";
import {and, eq, isNull} from "drizzle-orm";
import {requireVaultPermission} from "$lib/server/utils/vaultPermissions";
import {updateAuditFields} from "$lib/server/utils/audit";

export const updateBudget = async (
    session: App.AuthSession,
    data: UpdateBudgetRequest,
    env: Cloudflare.Env
) => {
    const client = drizzle(env.DB, { schema });

    // Check permission - only owner/admin can update budgets
    await requireVaultPermission(session, data.vaultId, 'canEditVault', env);

    // Check if budget exists
    const [existingBudget] = await client
        .select()
        .from(budgets)
        .where(and(
            eq(budgets.id, data.id),
            eq(budgets.vaultId, data.vaultId),
            isNull(budgets.deletedAt)
        ))
        .limit(1);

    if (!existingBudget) {
        throw new Error('Budget not found');
    }

    // Validate custom period has end date if period is being updated to custom
    const newPeriod = data.period || existingBudget.period;
    if (newPeriod === 'custom') {
        const newEndDate = data.endDate !== undefined ? data.endDate : existingBudget.endDate;
        if (!newEndDate) {
            throw new Error('End date is required for custom budget period');
        }
    }

    // Build update object with only provided fields
    const updateData: any = {
        ...updateAuditFields({ userId: session.user.id })
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.period !== undefined) updateData.period = data.period;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.categoryName !== undefined) updateData.categoryName = data.categoryName;
    if (data.templateId !== undefined) updateData.templateId = data.templateId;
    if (data.userId !== undefined) updateData.userId = data.userId;
    if (data.alertThreshold !== undefined) updateData.alertThreshold = data.alertThreshold;
    if (data.alertEnabled !== undefined) updateData.alertEnabled = data.alertEnabled;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update budget
    const [updatedBudget] = await client
        .update(budgets)
        .set(updateData)
        .where(eq(budgets.id, data.id))
        .returning();

    return updatedBudget;
};
