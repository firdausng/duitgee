<script lang="ts" module>
    import type { FilterField, FilterOp, FilterPill } from '$lib/filters/filter-types';

    export interface AddFilterPopoverProps {
        /** Available distinct values per field (derived by parent from loaded data). */
        options: {
            category: string[];
            fund: Array<{ id: string; name: string; icon?: string | null }>;
            paidBy: Array<{ id: string; name: string }>;
            paymentType: Array<{ value: string; label: string; icon?: string | null }>;
        };
        /** If set, popover opens in "edit" mode pre-filled with this pill. */
        editing?: FilterPill | null;
        /** Emits when user clicks Apply. Parent is responsible for append-or-replace. */
        onApply: (pill: FilterPill) => void;
        /** Anchor slot — the trigger button. Renders inline. */
        trigger: import('svelte').Snippet<[{ toggle: () => void; open: boolean }]>;
    }
</script>

<script lang="ts">
    import { cn } from '$lib/utils';
    import { FIELD_CONFIG, opLabel } from '$lib/filters/filter-types';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';

    let { options, editing = null, onApply, trigger }: AddFilterPopoverProps = $props();

    let open = $state(false);
    let containerRef: HTMLDivElement | null = $state(null);

    // Two-step state. If `field` is null, user is in step 1 (pick field).
    // If `field` is set, user is in step 2 (pick op/value).
    let field = $state<FilterField | null>(null);
    let op = $state<FilterOp>('is');
    let selectedValues = $state<string[]>([]);
    let amountMin = $state<string>('');
    let amountMax = $state<string>('');
    let negated = $state(false);

    function reset() {
        field = null;
        op = 'is';
        selectedValues = [];
        amountMin = '';
        amountMax = '';
        negated = false;
    }

    function hydrateFromEditing() {
        if (!editing) {
            reset();
            return;
        }
        field = editing.field;
        op = editing.op;
        negated = editing.negated;
        if (editing.field === 'amount') {
            if (editing.op === 'between') {
                amountMin = editing.values[0] ?? '';
                amountMax = editing.values[1] ?? '';
            } else {
                amountMin = editing.values[0] ?? '';
                amountMax = '';
            }
            selectedValues = [];
        } else {
            selectedValues = [...editing.values];
            amountMin = '';
            amountMax = '';
        }
    }

    function toggle() {
        open = !open;
        if (open) hydrateFromEditing();
    }

    function close() {
        open = false;
        reset();
    }

    function onDocumentClick(e: MouseEvent) {
        if (!open) return;
        if (!containerRef) return;
        // Use composedPath() rather than containerRef.contains(target) — the
        // target node may already be detached (e.g. a step-1 field button that
        // Svelte removed when it transitioned to step 2), in which case
        // `.contains()` returns false and would falsely close the popover on
        // the very click that was supposed to advance a step. composedPath
        // captures the ancestor chain at dispatch time.
        const path = e.composedPath();
        if (path.includes(containerRef)) return;
        close();
    }

    function onKeydown(e: KeyboardEvent) {
        if (!open) return;
        if (e.key === 'Escape') {
            close();
            e.preventDefault();
        }
    }

    function pickField(f: FilterField) {
        field = f;
        op = FIELD_CONFIG[f].ops[0];
        selectedValues = [];
    }

    function toggleValue(v: string) {
        if (selectedValues.includes(v)) {
            selectedValues = selectedValues.filter((x) => x !== v);
        } else {
            selectedValues = [...selectedValues, v];
        }
    }

    function handleApply() {
        if (!field) return;
        let pill: FilterPill;
        if (field === 'amount') {
            if (op === 'between') {
                if (!amountMin || !amountMax) return;
                pill = { field, op, values: [amountMin, amountMax], negated };
            } else {
                if (!amountMin) return;
                pill = { field, op, values: [amountMin], negated };
            }
        } else {
            if (selectedValues.length === 0) return;
            pill = { field, op, values: selectedValues, negated };
        }
        onApply(pill);
        close();
    }

    const canApply = $derived(
        field === 'amount'
            ? op === 'between'
                ? !!amountMin && !!amountMax
                : !!amountMin
            : selectedValues.length > 0,
    );
</script>

<svelte:document onclick={onDocumentClick} onkeydown={onKeydown} />

<div bind:this={containerRef} class="relative inline-flex">
    {@render trigger({ toggle, open })}

    {#if open}
        <div
            class="absolute top-full left-0 mt-1 w-80 rounded-[var(--radius-md)] border bg-popover text-popover-foreground shadow-lg z-50 overflow-hidden"
            role="dialog"
            aria-label="Add filter"
            style="animation: filter-pop-in 120ms var(--ease-out);"
        >
            {#if !field}
                <!-- Step 1: pick a field -->
                <div class="p-1">
                    <p class="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Filter on</p>
                    {#each Object.entries(FIELD_CONFIG) as [key, cfg]}
                        <button
                            type="button"
                            onclick={() => pickField(key as FilterField)}
                            class="w-full text-left px-3 py-2 rounded-[var(--radius-sm)] text-sm hover:bg-muted transition-colors"
                        >
                            {cfg.label}
                        </button>
                    {/each}
                </div>
            {:else}
                <!-- Step 2: value picker for the chosen field -->
                <div class="p-3 space-y-3">
                    <div class="flex items-center gap-2">
                        {#if !editing}
                            <button
                                type="button"
                                onclick={() => (field = null)}
                                class="inline-flex items-center justify-center size-6 rounded-[var(--radius-sm)] hover:bg-muted"
                                aria-label="Back"
                            >
                                <ChevronLeft class="size-4" />
                            </button>
                        {/if}
                        <p class="text-sm font-medium flex-1">{FIELD_CONFIG[field].label}</p>
                    </div>

                    <!-- Operator (for amount only) -->
                    {#if field === 'amount'}
                        <div class="flex flex-wrap gap-1.5">
                            {#each FIELD_CONFIG[field].ops as o}
                                {@const active = op === o}
                                <button
                                    type="button"
                                    onclick={() => (op = o)}
                                    class={cn(
                                        'px-2.5 h-7 rounded-[var(--radius-sm)] text-xs border transition-colors',
                                        active
                                            ? 'border-primary bg-primary/10 text-primary font-medium'
                                            : 'border-border text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    {opLabel(o, false)}
                                </button>
                            {/each}
                        </div>

                        <!-- Amount inputs -->
                        <div class="flex gap-2 items-center">
                            <Input
                                type="number"
                                inputmode="decimal"
                                step="0.01"
                                placeholder={op === 'between' ? 'Min' : 'Amount'}
                                bind:value={amountMin}
                                class="flex-1"
                            />
                            {#if op === 'between'}
                                <span class="text-xs text-muted-foreground">to</span>
                                <Input
                                    type="number"
                                    inputmode="decimal"
                                    step="0.01"
                                    placeholder="Max"
                                    bind:value={amountMax}
                                    class="flex-1"
                                />
                            {/if}
                        </div>
                    {:else}
                        <!-- Enum multi-select -->
                        <div class="max-h-64 overflow-y-auto space-y-0.5">
                            {#if field === 'category'}
                                {#if options.category.length === 0}
                                    <p class="px-2 py-3 text-xs text-muted-foreground text-center">No categories available.</p>
                                {:else}
                                    {#each options.category as v (v)}
                                        {@const active = selectedValues.includes(v)}
                                        <label class="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer hover:bg-muted text-sm">
                                            <Checkbox checked={active} onCheckedChange={() => toggleValue(v)} />
                                            <span class="truncate">{v || '—'}</span>
                                        </label>
                                    {/each}
                                {/if}
                            {:else if field === 'fund'}
                                <label class="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer hover:bg-muted text-sm">
                                    <Checkbox checked={selectedValues.includes('__none__')} onCheckedChange={() => toggleValue('__none__')} />
                                    <span class="text-muted-foreground">No fund</span>
                                </label>
                                {#if options.fund.length === 0}
                                    <p class="px-2 py-3 text-xs text-muted-foreground text-center">No funds in this vault.</p>
                                {:else}
                                    {#each options.fund as fund (fund.id)}
                                        {@const active = selectedValues.includes(fund.id)}
                                        <label class="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer hover:bg-muted text-sm">
                                            <Checkbox checked={active} onCheckedChange={() => toggleValue(fund.id)} />
                                            <span>{fund.icon ?? '💰'}</span>
                                            <span class="truncate">{fund.name}</span>
                                        </label>
                                    {/each}
                                {/if}
                            {:else if field === 'paidBy'}
                                <label class="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer hover:bg-muted text-sm">
                                    <Checkbox checked={selectedValues.includes('__vault__')} onCheckedChange={() => toggleValue('__vault__')} />
                                    <span class="text-muted-foreground">Vault-level</span>
                                </label>
                                {#if options.paidBy.length === 0}
                                    <p class="px-2 py-3 text-xs text-muted-foreground text-center">No members in this vault yet.</p>
                                {:else}
                                    {#each options.paidBy as member (member.id)}
                                        {@const active = selectedValues.includes(member.id)}
                                        <label class="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer hover:bg-muted text-sm">
                                            <Checkbox checked={active} onCheckedChange={() => toggleValue(member.id)} />
                                            <span class="truncate">{member.name}</span>
                                        </label>
                                    {/each}
                                {/if}
                            {:else if field === 'paymentType'}
                                {#if options.paymentType.length === 0}
                                    <p class="px-2 py-3 text-xs text-muted-foreground text-center">No payment types configured.</p>
                                {:else}
                                    {#each options.paymentType as pt (pt.value)}
                                        {@const active = selectedValues.includes(pt.value)}
                                        <label class="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] cursor-pointer hover:bg-muted text-sm">
                                            <Checkbox checked={active} onCheckedChange={() => toggleValue(pt.value)} />
                                            <span>{pt.icon ?? ''}</span>
                                            <span class="truncate">{pt.label}</span>
                                        </label>
                                    {/each}
                                {/if}
                            {/if}
                        </div>
                    {/if}

                    <!-- Negation toggle — destructive variant signals that it inverts the whole filter. -->
                    <label class="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer">
                        <Checkbox bind:checked={negated} variant="destructive" />
                        <span class="text-muted-foreground">Negate <span class="font-semibold">NOT</span></span>
                    </label>

                    <!-- Actions -->
                    <div class="flex justify-end gap-2 pt-1 border-t">
                        <Button type="button" variant="ghost" size="sm" onclick={close}>Cancel</Button>
                        <Button type="button" size="sm" onclick={handleApply} disabled={!canApply}>
                            {editing ? 'Update' : 'Apply'}
                        </Button>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    @keyframes filter-pop-in {
        from {
            opacity: 0;
            transform: translateY(-4px) scale(0.97);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
</style>
