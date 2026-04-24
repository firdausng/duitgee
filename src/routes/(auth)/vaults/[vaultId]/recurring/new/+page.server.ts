import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { createRecurringExpenseWithTemplateSchema } from '$lib/schemas/recurringExpenses';
import { formatDatetimeLocal } from '$lib/utils';

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

export const load = async ({ params, fetch, url }) => {
    const vaultId = params.vaultId;
    const duplicateFromId = url.searchParams.get('duplicateFrom');

    // If duplicating, fetch the source rule to seed form defaults.
    let source: SourceRule | null = null;
    if (duplicateFromId) {
        try {
            const res = await fetch(
                `/api/getRecurringExpense?vaultId=${vaultId}&id=${duplicateFromId}`,
            );
            if (res.ok) {
                const json = (await res.json()) as { success: boolean; data: SourceRule };
                if (json.success) source = json.data;
            }
        } catch {
            // fall through — unknown source id produces the blank form
        }
    }

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

    let members: Array<{ userId: string; displayName: string }> = [];
    try {
        const res = await fetch(`/api/getVault?vaultId=${vaultId}`);
        if (res.ok) {
            const json = (await res.json()) as { success: boolean; data: { members: typeof members } };
            if (json.success && json.data) members = json.data.members ?? [];
        }
    } catch {
        // non-critical
    }

    let funds: Array<{ id: string; name: string; icon: string | null; balance: number }> = [];
    try {
        const res = await fetch(`/api/getFunds?vaultId=${vaultId}`);
        if (res.ok) {
            const json = (await res.json()) as { success: boolean; data: Array<{ fund: { id: string; name: string; icon: string | null; balance: number; status: string } }> };
            if (json.success) {
                funds = (json.data ?? [])
                    .map((row) => row.fund)
                    .filter((f) => f.status === 'active');
            }
        }
    } catch {
        // non-critical
    }

    const duplicatingFrom = source
        ? { name: baseName || 'rule', icon: source.template.icon ?? '🔁' }
        : null;

    return { form, vaultId, members, funds, duplicatingFrom };
};
