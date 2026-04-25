import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import {
    expenses,
    funds,
    expenseTags,
    expenseTagAssignments,
} from '$lib/server/db/schema';
import * as authSchema from '$lib/server/db/better-auth-schema';
import { user as authUser } from '$lib/server/db/better-auth-schema';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import {
    serializeCsvHeader,
    serializeExpenseRow,
    type ExportRow,
} from '$lib/server/utils/csv';
import type { ExportExpensesQuery } from '$lib/schemas/csv';

const D1_PARAM_CHUNK = 50;

export interface ExportResult {
    /** Streaming response body — caller wraps with Content-Type/Disposition headers. */
    stream: ReadableStream<Uint8Array>;
    fileName: string;
}

/**
 * Stream a CSV of all expenses (optionally filtered) for a vault.
 *
 * Permission: requires `canViewExpenses` (every active vault member).
 * Entitlement: requires `expense:export` (free + pro).
 *
 * Streams via ReadableStream so we don't blow the 128MB Worker heap on vaults
 * with tens of thousands of expenses. The implementation buffers the
 * expense list itself (we need to know its length to chunk lookups) but emits
 * rows one at a time after that.
 */
export const exportExpenses = async (
    session: App.AuthSession,
    query: ExportExpensesQuery,
    env: Cloudflare.Env,
): Promise<ExportResult> => {
    // canViewExpenses isn't a discrete permission key — every active member
    // can view, so we just enforce membership via the closest gate.
    await requireVaultPermission(session, query.vaultId, 'canCreateExpenses', env);
    await requireVaultEntitlement(session, query.vaultId, 'expense:export', env);

    const client = drizzle(env.DB, { schema });

    let whereClause = and(eq(expenses.vaultId, query.vaultId), isNull(expenses.deletedAt));

    if (query.startDate) {
        whereClause = and(whereClause, sql`${expenses.date} >= ${query.startDate}`);
    }
    if (query.endDate) {
        whereClause = and(whereClause, sql`${expenses.date} <= ${query.endDate}`);
    }
    if (query.categoryName) {
        whereClause = and(whereClause, eq(expenses.categoryName, query.categoryName));
    }
    if (query.fundId) {
        whereClause = and(whereClause, eq(expenses.fundId, query.fundId));
    }
    if (query.memberIds) {
        const ids = query.memberIds.split(',').map((s) => s.trim()).filter(Boolean);
        if (ids.length > 0) {
            whereClause = and(whereClause, inArray(expenses.paidBy, ids));
        }
    }

    const rows = await client
        .select({
            id: expenses.id,
            date: expenses.date,
            amount: expenses.amount,
            categoryName: expenses.categoryName,
            paymentType: expenses.paymentType,
            note: expenses.note,
            paidBy: expenses.paidBy,
            fundName: funds.name,
            createdAt: expenses.createdAt,
            createdBy: expenses.createdBy,
        })
        .from(expenses)
        .leftJoin(funds, eq(expenses.fundId, funds.id))
        .where(whereClause)
        .orderBy(asc(expenses.date));

    const expenseIds = rows.map((r) => r.id);
    const userIds = Array.from(
        new Set(rows.map((r) => r.paidBy).filter((u): u is string => !!u)),
    );

    // Resolve userId → email via auth DB (chunked to stay under D1's 100-param cap).
    const emailByUserId = new Map<string, string>();
    if (userIds.length > 0) {
        try {
            const authClient = drizzle(env.AUTH_DB, { schema: authSchema });
            for (let i = 0; i < userIds.length; i += D1_PARAM_CHUNK) {
                const chunk = userIds.slice(i, i + D1_PARAM_CHUNK);
                const authRows = await authClient
                    .select({ id: authUser.id, email: authUser.email })
                    .from(authUser)
                    .where(inArray(authUser.id, chunk));
                for (const a of authRows) emailByUserId.set(a.id, a.email);
            }
        } catch (err) {
            console.error('Failed to resolve member emails for export:', err);
        }
    }

    // Resolve tags per expense (chunked).
    const tagsByExpense = new Map<string, string[]>();
    if (expenseIds.length > 0) {
        for (let i = 0; i < expenseIds.length; i += D1_PARAM_CHUNK) {
            const chunk = expenseIds.slice(i, i + D1_PARAM_CHUNK);
            const tagRows = await client
                .select({
                    expenseId: expenseTagAssignments.expenseId,
                    name: expenseTags.name,
                })
                .from(expenseTagAssignments)
                .innerJoin(expenseTags, eq(expenseTagAssignments.tagId, expenseTags.id))
                .where(
                    and(
                        inArray(expenseTagAssignments.expenseId, chunk),
                        isNull(expenseTags.deletedAt),
                    ),
                );
            for (const t of tagRows) {
                const list = tagsByExpense.get(t.expenseId) ?? [];
                list.push(t.name);
                tagsByExpense.set(t.expenseId, list);
            }
        }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            try {
                controller.enqueue(encoder.encode(serializeCsvHeader()));
                for (const row of rows) {
                    const exportRow: ExportRow = {
                        id: row.id,
                        date: row.date ?? '',
                        amount: row.amount,
                        categoryName: row.categoryName,
                        paymentType: row.paymentType,
                        note: row.note,
                        paidByEmail: row.paidBy ? (emailByUserId.get(row.paidBy) ?? null) : null,
                        tagNames: tagsByExpense.get(row.id) ?? [],
                        fundName: row.fundName ?? null,
                        createdAt: row.createdAt ?? '',
                        createdBy: row.createdBy,
                    };
                    controller.enqueue(encoder.encode(serializeExpenseRow(exportRow)));
                }
                controller.close();
            } catch (err) {
                controller.error(err);
            }
        },
    });

    const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return {
        stream,
        fileName: `expenses-${query.vaultId}-${stamp}.csv`,
    };
};
