<script lang="ts">
    type Props = {
        selectedTypes: string[];
        onchange: (types: string[]) => void;
    };

    let { selectedTypes, onchange }: Props = $props();

    const fundLevelTypes = [
        { value: 'top_up', label: 'Top Up' },
        { value: 'deduction', label: 'Deduction' },
        { value: 'transfer_in', label: 'Transfer In' },
        { value: 'transfer_out', label: 'Transfer Out' },
    ];

    const expenseLevelTypes = [
        { value: 'expense_paid', label: 'Expense' },
        { value: 'expense_reversal', label: 'Expense Reversal' },
        { value: 'pending_reimbursement', label: 'Pending Reimb.' },
        { value: 'reimbursement', label: 'Reimbursement' },
        { value: 'reimbursement_reversal', label: 'Reimb. Reversal' },
    ];

    function toggle(value: string) {
        const next = selectedTypes.includes(value)
            ? selectedTypes.filter((t) => t !== value)
            : [...selectedTypes, value];
        onchange(next);
    }
</script>

<div class="space-y-2">
    <div class="flex flex-wrap gap-1.5">
        {#each fundLevelTypes as type}
            <button
                type="button"
                onclick={() => toggle(type.value)}
                class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors
                    {selectedTypes.includes(type.value)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-muted-foreground hover:border-primary/50'}"
            >
                {type.label}
            </button>
        {/each}
    </div>
    <div class="flex flex-wrap gap-1.5">
        {#each expenseLevelTypes as type}
            <button
                type="button"
                onclick={() => toggle(type.value)}
                class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors
                    {selectedTypes.includes(type.value)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-muted-foreground hover:border-primary/50'}"
            >
                {type.label}
            </button>
        {/each}
    </div>
</div>
