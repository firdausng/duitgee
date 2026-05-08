<script lang="ts" module>
    import type { ScanAttachmentMultiResponse, ScanAttachmentMultiItem } from '$lib/schemas/scanAttachment';

    export type ScanReviewItem = ScanAttachmentMultiItem & {
        /** Per-row UI selection — defaults to true when the AI returned an amount. */
        selected: boolean;
    };

    export type ScanScreenshotModalProps = {
        open: boolean;
        loading: boolean;
        /** AI response — null while loading or before scan returns. */
        result: ScanAttachmentMultiResponse | null;
        /** Vault currency, used to flag mismatched currency rows. */
        vaultCurrency: string;
        /** How many rows can still be added to the form (MAX_ROWS - current). */
        availableSlots: number;
        formatCurrency: (amount: number) => string;
        onApply: (items: ScanReviewItem[], applySharedDate: boolean) => void;
        onCancel: () => void;
    };
</script>

<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import Sparkles from '@lucide/svelte/icons/sparkles';
    import Loader2 from '@lucide/svelte/icons/loader-2';
    import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
    import X from '@lucide/svelte/icons/x';

    let {
        open,
        loading,
        result,
        vaultCurrency,
        availableSlots,
        formatCurrency,
        onApply,
        onCancel,
    }: ScanScreenshotModalProps = $props();

    // Local mutable copy of the AI items so the user can toggle selection.
    let items = $state<ScanReviewItem[]>([]);
    let applySharedDate = $state(true);

    // Re-seed when a new scan result arrives.
    $effect(() => {
        if (!result) {
            items = [];
            return;
        }
        items = result.items.map((it, i) => ({
            ...it,
            // Auto-deselect rows the AI couldn't price; user can still tick them
            // but they'll be filtered out before apply since amount is required.
            // Slot cap: pre-select up to availableSlots rows; rest start unticked.
            selected: it.amount !== null && i < availableSlots,
        }));
        applySharedDate = !!result.sourceDate;
    });

    const selectedCount = $derived(items.filter((i) => i.selected && i.amount !== null).length);
    const overflow = $derived(selectedCount > availableSlots);

    const hasCurrencyMismatch = $derived(result?.warnings.includes('currency_mismatch') ?? false);
    const wasTruncated = $derived(result?.warnings.includes('truncated_to_20') ?? false);
    const parseFailed = $derived(result?.warnings.includes('parse_failed') ?? false);

    function isWrongCurrency(currency: string | null): boolean {
        if (!currency) return false;
        return currency.toUpperCase() !== vaultCurrency.toUpperCase();
    }

    function toggle(idx: number) {
        items = items.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it));
    }

    function selectAll() {
        items = items.map((it, i) => ({
            ...it,
            selected: it.amount !== null && i < availableSlots,
        }));
    }

    function selectNone() {
        items = items.map((it) => ({ ...it, selected: false }));
    }

    function handleApply() {
        const kept = items.filter((it) => it.selected && it.amount !== null);
        onApply(kept, applySharedDate);
    }

    function confidenceClass(c: 'high' | 'medium' | 'low'): string {
        if (c === 'high') return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900';
        if (c === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900';
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900';
    }
</script>

{#if open}
    <div
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-modal-title"
    >
        <div class="w-full max-w-lg max-h-[90vh] flex flex-col rounded-[var(--radius-md)] bg-popover text-popover-foreground border shadow-lg">
            <div class="flex items-start justify-between gap-3 p-5 border-b">
                <div class="min-w-0">
                    <h2 id="scan-modal-title" class="text-base font-semibold flex items-center gap-2">
                        <Sparkles class="size-4 text-primary" />
                        Review scanned items
                    </h2>
                    {#if result?.sourceMerchant}
                        <p class="text-sm text-muted-foreground mt-1 truncate">
                            From <span class="font-medium">{result.sourceMerchant}</span>
                        </p>
                    {:else if !loading && !parseFailed}
                        <p class="text-sm text-muted-foreground mt-1">
                            Pick which items to add as expenses.
                        </p>
                    {/if}
                </div>
                <button
                    type="button"
                    onclick={onCancel}
                    aria-label="Close"
                    class="rounded-[var(--radius-sm)] p-1 hover:bg-muted text-muted-foreground"
                >
                    <X class="size-4" />
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-5 space-y-3">
                {#if loading}
                    <div class="flex flex-col items-center justify-center py-10 gap-3">
                        <Loader2 class="size-6 animate-spin text-primary" />
                        <p class="text-sm text-muted-foreground">Reading the screenshot…</p>
                    </div>
                {:else if parseFailed || items.length === 0}
                    <div class="flex flex-col items-center justify-center py-10 gap-3 text-center">
                        <AlertTriangle class="size-6 text-muted-foreground" />
                        <div>
                            <p class="text-sm font-medium">Couldn't read any items</p>
                            <p class="text-xs text-muted-foreground mt-1">
                                The AI didn't find recognisable expenses in this image. Try a single scan from a row instead, or upload a clearer screenshot.
                            </p>
                        </div>
                    </div>
                {:else}
                    {#if hasCurrencyMismatch || wasTruncated}
                        <div class="rounded-[var(--radius-sm)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-300 space-y-1">
                            {#if wasTruncated}
                                <p>This screenshot has more than 20 items — only the first 20 are shown.</p>
                            {/if}
                            {#if hasCurrencyMismatch}
                                <p>Items use different currencies — review carefully before applying.</p>
                            {/if}
                        </div>
                    {/if}

                    {#if result?.sourceDate}
                        <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input
                                type="checkbox"
                                bind:checked={applySharedDate}
                                class="size-4 rounded border-input"
                            />
                            Use <span class="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{new Date(result.sourceDate).toLocaleDateString()}</span> as the shared date
                        </label>
                    {/if}

                    <div class="flex items-center justify-between text-xs">
                        <span class="text-muted-foreground">
                            {selectedCount} of {items.length} selected
                            {#if overflow}
                                <span class="text-destructive">· too many (max {availableSlots})</span>
                            {/if}
                        </span>
                        <div class="flex items-center gap-3">
                            <button type="button" onclick={selectAll} class="text-primary hover:underline">All</button>
                            <button type="button" onclick={selectNone} class="text-muted-foreground hover:underline">None</button>
                        </div>
                    </div>

                    <ul class="space-y-2">
                        {#each items as item, i (i)}
                            {@const wrongCurrency = isWrongCurrency(item.currency)}
                            <li
                                class="flex items-start gap-3 rounded-[var(--radius-sm)] border p-3 transition-colors"
                                class:bg-muted={!item.selected}
                                class:opacity-60={!item.selected}
                            >
                                <input
                                    type="checkbox"
                                    checked={item.selected}
                                    onchange={() => toggle(i)}
                                    disabled={item.amount === null}
                                    class="mt-0.5 size-4 rounded border-input shrink-0"
                                    aria-label="Include this item"
                                />
                                <div class="flex-1 min-w-0 space-y-1">
                                    <div class="flex items-baseline justify-between gap-2">
                                        <p class="text-sm font-medium truncate">
                                            {item.note ?? '(no description)'}
                                        </p>
                                        <p class="font-mono text-sm tabular-nums shrink-0">
                                            {#if item.amount === null}
                                                <span class="text-destructive">no amount</span>
                                            {:else if item.currency && wrongCurrency}
                                                <span class="text-amber-700 dark:text-amber-400">{item.currency} {item.amount.toFixed(2)}</span>
                                            {:else}
                                                {formatCurrency(item.amount)}
                                            {/if}
                                        </p>
                                    </div>
                                    <div class="flex items-center gap-1.5 flex-wrap text-xs">
                                        <span class="text-muted-foreground">{item.suggestedCategory}</span>
                                        <span
                                            class="inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] uppercase tracking-wide font-medium {confidenceClass(item.confidence)}"
                                        >
                                            {item.confidence}
                                        </span>
                                        {#if wrongCurrency}
                                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-[10px] dark:bg-amber-950 dark:border-amber-900 dark:text-amber-300">
                                                <AlertTriangle class="size-2.5" />
                                                {item.currency} ≠ {vaultCurrency}
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>

            <div class="flex items-center justify-end gap-2 px-5 py-3 border-t bg-muted/30">
                <Button variant="ghost" onclick={onCancel} disabled={loading}>Cancel</Button>
                <Button
                    onclick={handleApply}
                    disabled={loading || selectedCount === 0 || overflow}
                >
                    Add {selectedCount} item{selectedCount === 1 ? '' : 's'}
                </Button>
            </div>
        </div>
    </div>
{/if}
