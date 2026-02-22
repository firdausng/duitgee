<script lang="ts">
    import { format, parseISO } from 'date-fns';

    export type FundTransaction = {
        id: string;
        type: string;
        amount: number;
        note: string | null;
        expenseId: string | null;
        fundTransferId: string | null;
        createdAt: string;
        otherFundName: string | null;
    };

    type DateGroup = {
        dateKey: string;
        dateLabel: string;
        transactions: FundTransaction[];
    };

    type Props = {
        transactions: FundTransaction[];
        formatCurrency?: (n: number) => string;
    };

    let { transactions, formatCurrency }: Props = $props();

    function defaultFormat(n: number) {
        return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const fmt = $derived(formatCurrency ?? defaultFormat);

    function groupByDate(txs: FundTransaction[]): DateGroup[] {
        const grouped = new Map<string, FundTransaction[]>();
        for (const tx of txs) {
            const dateKey = format(parseISO(tx.createdAt), 'yyyy-MM-dd');
            if (!grouped.has(dateKey)) grouped.set(dateKey, []);
            grouped.get(dateKey)!.push(tx);
        }
        return Array.from(grouped.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([dateKey, list]) => ({
                dateKey,
                dateLabel: format(parseISO(dateKey), 'EEEE, MMM d, yyyy'),
                transactions: list,
            }));
    }

    const groups = $derived(groupByDate(transactions));

    type TypeMeta = { label: string; sign: '+' | '−' | ''; amountClass: string; badgeClass: string };

    function typeMeta(type: string, otherFundName: string | null): TypeMeta {
        switch (type) {
            case 'top_up':
                return { label: 'Topped Up', sign: '+', amountClass: 'text-green-600 dark:text-green-400', badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
            case 'deduction':
                return { label: 'Deducted', sign: '−', amountClass: 'text-red-600 dark:text-red-400', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
            case 'expense_paid':
                return { label: 'Expense', sign: '−', amountClass: 'text-red-600 dark:text-red-400', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
            case 'expense_reversal':
                return { label: 'Expense Reversal', sign: '+', amountClass: 'text-green-600 dark:text-green-400', badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
            case 'pending_reimbursement':
                return { label: 'Pending Reimbursement', sign: '', amountClass: '', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
            case 'reimbursement':
                return { label: 'Reimbursement Settled', sign: '−', amountClass: 'text-orange-600 dark:text-orange-400', badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
            case 'reimbursement_reversal':
                return { label: 'Reimbursement Reversed', sign: '+', amountClass: 'text-green-600 dark:text-green-400', badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
            case 'transfer_in':
                return {
                    label: otherFundName ? `Transfer from ${otherFundName}` : 'Transfer In',
                    sign: '+',
                    amountClass: 'text-green-600 dark:text-green-400',
                    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                };
            case 'transfer_out':
                return {
                    label: otherFundName ? `Transfer to ${otherFundName}` : 'Transfer Out',
                    sign: '−',
                    amountClass: 'text-red-600 dark:text-red-400',
                    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                };
            default:
                return { label: type, sign: '', amountClass: '', badgeClass: 'bg-muted text-muted-foreground' };
        }
    }
</script>

{#if groups.length === 0}
    <div class="text-center py-12">
        <div class="text-5xl mb-3">📋</div>
        <p class="text-sm text-muted-foreground">No activity found.</p>
    </div>
{:else}
    {#each groups as group (group.dateKey)}
        <!-- Sticky date header -->
        <div class="sticky top-0 flex justify-center mb-2 pt-1">
            <h3 class="text-xs font-semibold text-foreground bg-muted/80 backdrop-blur-sm px-3 py-1.5 rounded-md inline-block">
                {group.dateLabel}
            </h3>
        </div>

        <!-- Transactions for this day -->
        <ul class="divide-y mb-4 border rounded-lg overflow-hidden">
            {#each group.transactions as tx (tx.id)}
                {@const meta = typeMeta(tx.type, tx.otherFundName)}
                <li class="flex items-center gap-3 px-3 py-3 bg-card">
                    <!-- Type badge -->
                    <span class="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap {meta.badgeClass}">
                        {meta.label}
                    </span>
                    <!-- Note -->
                    <p class="flex-1 min-w-0 text-sm text-muted-foreground truncate">
                        {tx.note ?? ''}
                    </p>
                    <!-- Amount -->
                    {#if tx.type !== 'pending_reimbursement'}
                        <span class="shrink-0 text-sm font-semibold tabular-nums {meta.amountClass}">
                            {meta.sign}{fmt(tx.amount)}
                        </span>
                    {/if}
                </li>
            {/each}
        </ul>
    {/each}
{/if}
