import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { funds, fundTransactions, fundTransfers } from '$lib/server/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { requireVaultPermission } from '$lib/server/utils/vaultPermissions';
import { requireVaultEntitlement } from '$lib/server/utils/entitlements';
import { initialAuditFields, updateAuditFields } from '$lib/server/utils/audit';
import { getActiveCycleOrCreate } from './getActiveCycleOrCreate';
import { createId } from '@paralleldrive/cuid2';
import { formatISO } from 'date-fns';
import { UTCDate } from '@date-fns/utc';
import type { TransferFunds } from '$lib/schemas/funds';

export const transferFunds = async (
    session: App.AuthSession,
    data: TransferFunds,
    env: Cloudflare.Env,
) => {
    await requireVaultPermission(session, data.vaultId, 'canManageFunds', env);
    await requireVaultEntitlement(session, data.vaultId, 'fund:transfer', env);

    if (data.fromFundId === data.toFundId) {
        throw new Error('Source and destination funds must be different');
    }

    const client = drizzle(env.DB, { schema });
    const userId = session.user.id;
    const auditFields = initialAuditFields({ userId });

    // Fetch both funds and confirm they belong to the same vault
    const [fromFund] = await client
        .select()
        .from(funds)
        .where(and(eq(funds.id, data.fromFundId), eq(funds.vaultId, data.vaultId), isNull(funds.deletedAt)))
        .limit(1);

    if (!fromFund) throw new Error('Source fund not found');
    if (fromFund.status === 'archived') throw new Error('Cannot transfer from an archived fund');

    const [toFund] = await client
        .select()
        .from(funds)
        .where(and(eq(funds.id, data.toFundId), eq(funds.vaultId, data.vaultId), isNull(funds.deletedAt)))
        .limit(1);

    if (!toFund) throw new Error('Destination fund not found');

    if (fromFund.balance < data.amount) {
        throw new Error(
            `Insufficient balance in source fund "${fromFund.name}". Available: ${fromFund.balance}, required: ${data.amount}`,
        );
    }

    // Resolve active cycles before the batch — lazy rollover may write
    const fromCycle = await getActiveCycleOrCreate(fromFund.id, userId, env);
    const toCycle = await getActiveCycleOrCreate(toFund.id, userId, env);

    // Pre-generate IDs so the batch INSERT statements can reference each other
    // without needing RETURNING (which D1 batch does not guarantee ordering for)
    const transferId = createId();
    const outTxId = createId();
    const inTxId = createId();
    const now = formatISO(new UTCDate());

    // D1 batch: 3 inserts + 2 balance updates — all atomic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.batch([
        // 1. Fund transfer record (the first-class entity tying the two sides)
        client.insert(fundTransfers).values({
            id: transferId,
            vaultId: data.vaultId,
            fromFundId: fromFund.id,
            toFundId: toFund.id,
            amount: data.amount,
            note: data.note ?? null,
            transferredAt: now,
            transferredBy: userId,
            ...auditFields,
        }),

        // 2. transfer_out transaction on the source fund's active cycle
        client.insert(fundTransactions).values({
            id: outTxId,
            fundId: fromFund.id,
            cycleId: fromCycle.id,
            type: 'transfer_out',
            amount: data.amount,
            fundTransferId: transferId,
            note: data.note ?? null,
            ...auditFields,
        }),

        // 3. transfer_in transaction on the destination fund's active cycle
        client.insert(fundTransactions).values({
            id: inTxId,
            fundId: toFund.id,
            cycleId: toCycle.id,
            type: 'transfer_in',
            amount: data.amount,
            fundTransferId: transferId,
            note: data.note ?? null,
            ...auditFields,
        }),

        // 4. Deduct from source fund balance cache
        client
            .update(funds)
            .set({ balance: sql`${funds.balance} - ${data.amount}`, ...updateAuditFields({ userId }) })
            .where(eq(funds.id, fromFund.id)),

        // 5. Add to destination fund balance cache
        client
            .update(funds)
            .set({ balance: sql`${funds.balance} + ${data.amount}`, ...updateAuditFields({ userId }) })
            .where(eq(funds.id, toFund.id)),
    ] as any);

    return {
        transferId,
        fromFund: {
            id: fromFund.id,
            name: fromFund.name,
            newBalance: fromFund.balance - data.amount,
        },
        toFund: {
            id: toFund.id,
            name: toFund.name,
            newBalance: toFund.balance + data.amount,
        },
        amount: data.amount,
    };
};
