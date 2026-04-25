import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { createRecurringExpenseWithTemplateSchema } from '$lib/schemas/recurringExpenses';
import { formatDatetimeLocal } from '$lib/utils';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRecurringExpense } from '$lib/server/api/recurring-expenses/getRecurringExpenseHandler';
import { getVault } from '$lib/server/api/vaults/getVaultHandler';
import { getFunds } from '$lib/server/api/funds/getFundsHandler';

type SourceRule = {
    id: string;
    name: string | null;
    scheduleUnit: 'day' | 'week' | 'month' | 'year';
    scheduleInterval: number;
    generationMode: 'auto' | 'queue';
    endAfterCount: number | null;
    template: {
        name: string | null;
        icon: string | null;
        defaultAmount: number | null;
        defaultCategoryName: string | null;
        defaultNote: string | null;
        defaultPaymentType: string | null;
        defaultPaidBy: string | null;
        defaultFundId: string | null;
        defaultFundPaymentMode: string | null;
    };
};

export const load: PageServerLoad = async ({ params, url, locals, platform }) => {
    if (platform === undefined) throw new Error('No platform');
    if (!locals.currentUser) throw error(401, 'Unauthorized');

    const vaultId = params.vaultId;
    const duplicateFromId = url.searchParams.get('duplicateFrom');
    const session = locals.currentSession;
    const env = platform.env;

    // All independent reads in parallel via direct handler calls.
    const [sourceResult, vaultResult, fundRows] = await Promise.all([
        duplicateFromId
            ? getRecurringExpense(session, { vaultId, id: duplicateFromId }, env).catch(() => null)
            : Promise.resolve(null),
        getVault(session, vaultId, env).catch((err) => {
            console.error('Failed to load vault:', err);
            return null;
        }),
        getFunds(vaultId, session, env).catch((err) => {
            console.error('Failed to load funds:', err);
            return [];
        }),
    ]);

    const source = sourceResult as SourceRule | null;

    const baseName = source?.name ?? source?.template.name ?? '';
    const defaults = source
        ? {
              vaultId,
              name: baseName ? `${baseName} (copy)` : '',
              icon: source.template.icon ?? '🔁',
              defaultAmount: source.template.defaultAmount ?? 0,
              defaultCategoryName: source.template.defaultCategoryName ?? '',
              defaultNote: source.template.defaultNote ?? null,
              defaultPaymentType: source.template.defaultPaymentType ?? 'cash',
              defaultPaidBy: source.template.defaultPaidBy ?? '__creator__',
              defaultFundId: source.template.defaultFundId ?? null,
              defaultFundPaymentMode: source.template.defaultFundPaymentMode as
                  | 'paid_by_fund'
                  | 'pending_reimbursement'
                  | null
                  | undefined,
              scheduleUnit: source.scheduleUnit,
              scheduleInterval: source.scheduleInterval,
              // Anchor always resets to "now" — a duplicate starts fresh unless user edits.
              anchorDate: formatDatetimeLocal(new Date()),
              generationMode: source.generationMode,
              endAfterCount: source.endAfterCount,
              backfill: false,
          }
        : {
              vaultId,
              name: '',
              icon: '🔁',
              defaultAmount: 0,
              defaultCategoryName: '',
              defaultPaymentType: 'cash',
              defaultPaidBy: '__creator__',
              scheduleUnit: 'month' as const,
              scheduleInterval: 1,
              anchorDate: formatDatetimeLocal(new Date()),
              generationMode: 'queue' as const,
              backfill: false,
          };

    const form = await superValidate(
        valibot(createRecurringExpenseWithTemplateSchema, { defaults }),
    );

    const members: Array<{ userId: string; displayName: string }> = (vaultResult?.members ?? []).map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
    }));

    const funds: Array<{ id: string; name: string; icon: string | null; balance: number }> = (fundRows ?? [])
        .map((row: any) => ({
            id: row.fund.id,
            name: row.fund.name,
            icon: row.fund.icon ?? null,
            balance: row.fund.balance,
            status: row.fund.status,
        }))
        .filter((f) => f.status === 'active')
        .map(({ status, ...rest }) => rest);

    const duplicatingFrom = source
        ? { name: baseName || 'rule', icon: source.template.icon ?? '🔁' }
        : null;

    return { form, vaultId, members, funds, duplicatingFrom };
};
