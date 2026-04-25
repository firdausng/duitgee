import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { vaultMembers, expenseTags } from '$lib/server/db/schema';
import * as authSchema from '$lib/server/db/better-auth-schema';
import { user as authUser } from '$lib/server/db/better-auth-schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import { parseCsvText, normalizeRows, type ImportLookups } from '$lib/server/utils/csv';
import {
    MAX_IMPORT_ROWS,
    type PreviewImportResponse,
} from '$lib/schemas/csv';

const D1_PARAM_CHUNK = 50;

/**
 * Parse and validate an uploaded CSV without writing anything.
 *
 * Returns normalized rows + a list of errors + tags that would need to be
 * created. The client echoes the normalized rows back to confirmImportExpenses
 * along with the importToken to actually persist.
 */
export const previewImportExpenses = async (
    session: App.AuthSession,
    vaultId: string,
    csvText: string,
    env: Cloudflare.Env,
): Promise<PreviewImportResponse> => {
    await requireVaultPermission(session, vaultId, 'canCreateExpenses', env);
    await requireVaultEntitlement(session, vaultId, 'expense:import', env);

    const { rows, parseErrors, referencedEmails } = parseCsvText(csvText);

    if (rows.length > MAX_IMPORT_ROWS) {
        throw new Error(
            `Import exceeds the ${MAX_IMPORT_ROWS}-row limit (got ${rows.length}). Split the file by date and import in chunks.`,
        );
    }

    const client = drizzle(env.DB, { schema });

    // Resolve email → userId for vault members. Only members of THIS vault
    // count; an email that exists in the auth DB but isn't a member here
    // produces a row error (correct behavior — the import shouldn't grant
    // access).
    const emailToUserId = new Map<string, string>();
    if (referencedEmails.length > 0) {
        try {
            const authClient = drizzle(env.AUTH_DB, { schema: authSchema });
            const userRows: Array<{ id: string; email: string }> = [];
            for (let i = 0; i < referencedEmails.length; i += D1_PARAM_CHUNK) {
                const chunk = referencedEmails.slice(i, i + D1_PARAM_CHUNK);
                const found = await authClient
                    .select({ id: authUser.id, email: authUser.email })
                    .from(authUser)
                    .where(inArray(authUser.email, chunk));
                userRows.push(...found);
            }
            const userIds = userRows.map((u) => u.id);
            if (userIds.length > 0) {
                // Only keep users that are active members of THIS vault.
                const memberRows: Array<{ userId: string }> = [];
                for (let i = 0; i < userIds.length; i += D1_PARAM_CHUNK) {
                    const chunk = userIds.slice(i, i + D1_PARAM_CHUNK);
                    const m = await client
                        .select({ userId: vaultMembers.userId })
                        .from(vaultMembers)
                        .where(
                            and(
                                eq(vaultMembers.vaultId, vaultId),
                                eq(vaultMembers.status, 'active'),
                                inArray(vaultMembers.userId, chunk),
                            ),
                        );
                    memberRows.push(...m);
                }
                const activeMemberIds = new Set(memberRows.map((m) => m.userId));
                for (const u of userRows) {
                    if (activeMemberIds.has(u.id)) {
                        emailToUserId.set(u.email.toLowerCase(), u.id);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to resolve member emails during import preview:', err);
        }
    }

    // Resolve existing vault tag names (case-insensitive lookup map).
    const tagRows = await client
        .select({ id: expenseTags.id, name: expenseTags.name })
        .from(expenseTags)
        .where(and(eq(expenseTags.vaultId, vaultId), isNull(expenseTags.deletedAt)));

    const tagNameToId = new Map<string, string>();
    for (const t of tagRows) tagNameToId.set(t.name.toLowerCase(), t.id);

    const lookups: ImportLookups = { emailToUserId, tagNameToId };
    const result = normalizeRows(rows, lookups);

    return {
        importToken: createId(),
        totalRows: rows.length,
        validRows: result.validRows,
        errors: [...parseErrors, ...result.errors],
        newTagNames: result.newTagNames,
    };
};
