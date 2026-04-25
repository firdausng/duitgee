import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    expenses,
    expenseTags,
    expenseTagAssignments,
} from '$lib/server/db/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { categoryData } from '$lib/configurations/categories';
import { initialAuditFields } from '$lib/server/utils/audit';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import { IMPORT_BATCH_SIZE, type ConfirmImportPayload, type ConfirmImportResponse } from '$lib/schemas/csv';

/**
 * Persist normalized rows previously returned by previewImportExpenses.
 *
 * Idempotency: the importToken stamps every row via `importBatchId`. If a user
 * accidentally posts twice, the second batch gets a different token (cuid is
 * minted per-call) — that's a known limitation; the UI uses the same token
 * across retries to dedupe at the client. Server-side enforcement would
 * require a separate `import_batches` table; deferred to v2.
 *
 * Atomicity: D1 has no cross-statement transactions. We chunk into
 * IMPORT_BATCH_SIZE-row batches; each batch is atomic. If a batch fails
 * mid-import, prior batches are already persisted — we return the current
 * importBatchId so the user can "Undo import" to soft-delete them.
 */
export const confirmImportExpenses = async (
    session: App.AuthSession,
    payload: ConfirmImportPayload,
    env: Cloudflare.Env,
): Promise<ConfirmImportResponse> => {
    await requireVaultPermission(session, payload.vaultId, 'canCreateExpenses', env);
    await requireVaultEntitlement(session, payload.vaultId, 'expense:import', env);

    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;
    const auditFields = initialAuditFields({ userId });
    const importBatchId = payload.importToken;

    // Step 1: resolve all referenced tag names → tagIds. Auto-create any that
    // don't exist. We do this up-front in one batch so the row-insert phase
    // doesn't need to round-trip per row.
    const allTagNames = new Set<string>();
    for (const row of payload.rows) {
        for (const tag of row.tagNames) allTagNames.add(tag);
    }

    const tagNameToId = new Map<string, string>();
    if (allTagNames.size > 0) {
        const existing = await client
            .select({ id: expenseTags.id, name: expenseTags.name })
            .from(expenseTags)
            .where(
                and(
                    eq(expenseTags.vaultId, payload.vaultId),
                    isNull(expenseTags.deletedAt),
                    inArray(expenseTags.name, Array.from(allTagNames)),
                ),
            );
        for (const t of existing) tagNameToId.set(t.name.toLowerCase(), t.id);

        const toCreate = Array.from(allTagNames).filter(
            (name) => !tagNameToId.has(name.toLowerCase()),
        );
        if (toCreate.length > 0) {
            const tagInserts = toCreate.map((name) => ({
                id: createId(),
                vaultId: payload.vaultId,
                name,
                ...auditFields,
            }));
            // One batch — even at 100+ tags this is well under D1's limits.
            const batch = tagInserts.map((t) => client.insert(expenseTags).values(t));
            if (batch.length > 0) {
                await client.batch(batch as [typeof batch[0], ...typeof batch]);
            }
            for (const t of tagInserts) tagNameToId.set(t.name.toLowerCase(), t.id);
        }
    }

    // Step 2: insert expenses + tag assignments in IMPORT_BATCH_SIZE-row chunks.
    let importedCount = 0;
    const knownCategoryNames = new Set(categoryData.categories.map((c) => c.name));

    for (let i = 0; i < payload.rows.length; i += IMPORT_BATCH_SIZE) {
        const chunk = payload.rows.slice(i, i + IMPORT_BATCH_SIZE);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ops: any[] = [];

        for (const row of chunk) {
            // Skip invalid rows if requested (preview surfaced their errors;
            // here we trust the client's filter).
            if (payload.skipInvalid && !row.date) continue;

            const expenseId = createId();
            // Re-resolve canonical category casing here in case the client tampered
            // with the echoed payload; falls through to free-form otherwise (matches
            // createExpenseHandler behavior).
            const categoryName = knownCategoryNames.has(row.categoryName)
                ? row.categoryName
                : categoryData.categories.find(
                      (c) => c.name.toLowerCase() === row.categoryName.toLowerCase(),
                  )?.name ?? row.categoryName;

            ops.push(
                client.insert(expenses).values({
                    id: expenseId,
                    note: row.note,
                    amount: row.amount,
                    categoryName,
                    paymentType: row.paymentType,
                    date: row.date,
                    paidBy: row.paidBy,
                    vaultId: payload.vaultId,
                    importBatchId,
                    ...auditFields,
                }),
            );

            for (const tagName of row.tagNames) {
                const tagId = tagNameToId.get(tagName.toLowerCase());
                if (!tagId) continue; // shouldn't happen post-step-1
                ops.push(
                    client.insert(expenseTagAssignments).values({
                        expenseId,
                        tagId,
                        createdBy: userId,
                    }),
                );
            }

            importedCount += 1;
        }

        if (ops.length === 0) continue;

        try {
            await client.batch(ops as [typeof ops[0], ...typeof ops]);
        } catch (err) {
            // Partial commit: prior batches succeeded. Return where we stopped
            // so the UI can offer "Undo import {importBatchId}" and let the
            // user retry the rest.
            const failedAtRow = chunk[0]?.lineNumber;
            console.error('Import batch failed:', err);
            return {
                success: false,
                importedCount: importedCount - chunk.length, // last chunk didn't commit
                importBatchId,
                failedAtRow,
                error: err instanceof Error ? err.message : 'Batch insert failed',
            };
        }
    }

    return {
        success: true,
        importedCount,
        importBatchId,
    };
};

/**
 * Undo a previous import by soft-deleting all expenses stamped with the given
 * importBatchId. Bounded to the user's vault to keep cross-vault leakage
 * impossible even if a token is guessed.
 */
export const undoImportExpenses = async (
    session: App.AuthSession,
    vaultId: string,
    importBatchId: string,
    env: Cloudflare.Env,
): Promise<{ undoneCount: number }> => {
    await requireVaultPermission(session, vaultId, 'canDeleteExpenses', env);

    const client = drizzle(env.DB, { schema });
    const now = new Date().toISOString();

    const result = await client
        .update(expenses)
        .set({
            deletedAt: now,
            deletedBy: session.user.id,
        })
        .where(
            and(
                eq(expenses.vaultId, vaultId),
                eq(expenses.importBatchId, importBatchId),
                isNull(expenses.deletedAt),
            ),
        )
        .returning({ id: expenses.id });

    return { undoneCount: result.length };
};
