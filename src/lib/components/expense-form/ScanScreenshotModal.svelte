<script lang="ts" module>
    import type { ScanAttachmentMultiResponse, ScanAttachmentMultiItem } from '$lib/schemas/scanAttachment';

    export type ScanReviewItem = ScanAttachmentMultiItem & {
        /** Per-row UI selection — defaults to true when the AI returned an amount. */
        selected: boolean;
        /** Per-row template — null = no template; undefined seeded → defaultTemplateId. */
        templateId: string | null;
    };

    export type ScanModalTemplate = {
        id: string;
        name: string;
        icon?: string | null;
    };

    export type ScanScreenshotModalProps = {
        open: boolean;
        loading: boolean;
        /** AI response — null while loading or before scan returns. */
        result: ScanAttachmentMultiResponse | null;
        /** Per-item review state — owned by the parent so toggles survive cancel→reopen. */
        items: ScanReviewItem[];
        /** Vault currency, used to flag mismatched currency rows. */
        vaultCurrency: string;
        /** How many rows can still be added to the form (MAX_ROWS - current). */
        availableSlots: number;
        /** Vault's templates — drives the per-row template picker. Empty = picker hidden. */
        templates?: ScanModalTemplate[];
        /** Default template applied to a row when the user hasn't picked one. */
        defaultTemplateId?: string | null;
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
        items = $bindable([]),
        vaultCurrency,
        availableSlots,
        templates = [],
        defaultTemplateId = null,
        formatCurrency,
        onApply,
        onCancel,
    }: ScanScreenshotModalProps = $props();

    // applySharedDate is local — re-seeded each open from result.sourceDate.
    let applySharedDate = $state(true);
    $effect(() => {
        if (open) applySharedDate = !!result?.sourceDate;
    });

    // Per-row template picker: which row's picker is currently expanded (-1 = none).
    let templatePickerOpen = $state<number>(-1);
    let templateSearch = $state('');
    $effect(() => {
        // Reset picker when a different row is opened or modal closes.
        templatePickerOpen;
        templateSearch = '';
    });

    const showTemplatePicker = $derived(templates.length > 0);
    const templateById = $derived(new Map(templates.map((t) => [t.id, t])));

    function templateLabel(id: string | null): string {
        if (!id) return 'No template';
        return templateById.get(id)?.name ?? '(deleted)';
    }
    function templateIcon(id: string | null): string {
        if (!id) return '—';
        return templateById.get(id)?.icon ?? '📝';
    }

    function setRowTemplate(idx: number, templateId: string | null) {
        items[idx] = { ...items[idx], templateId };
        templatePickerOpen = -1;
    }

    function visibleTemplates(query: string): ScanModalTemplate[] {
        const q = query.trim().toLowerCase();
        if (!q) return templates;
        return templates.filter((t) => t.name.toLowerCase().includes(q));
    }

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
        items[idx] = { ...items[idx], selected: !items[idx].selected };
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
                                        {#if showTemplatePicker}
                                            <div class="relative">
                                                <button
                                                    type="button"
                                                    onclick={() => (templatePickerOpen = templatePickerOpen === i ? -1 : i)}
                                                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border bg-muted/50 text-[10px] hover:bg-muted transition-colors"
                                                    title="Pick a template for this expense"
                                                >
                                                    <span>{templateIcon(item.templateId)}</span>
                                                    <span class="truncate max-w-[8rem]">{templateLabel(item.templateId)}</span>
                                                    <span class="opacity-50">▾</span>
                                                </button>
                                                {#if templatePickerOpen === i}
                                                    <div
                                                        class="absolute z-10 left-0 top-full mt-1 w-56 rounded-[var(--radius-sm)] border bg-popover shadow-lg p-1"
                                                        role="menu"
                                                    >
                                                        <input
                                                            type="text"
                                                            bind:value={templateSearch}
                                                            placeholder="Search templates…"
                                                            class="w-full h-7 rounded-[var(--radius-sm)] border border-input bg-background px-2 text-xs mb-1 focus:outline-none focus:ring-2 focus:ring-ring"
                                                        />
                                                        <div class="max-h-48 overflow-y-auto">
                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                onclick={() => setRowTemplate(i, null)}
                                                                class="w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-left text-xs"
                                                            >
                                                                <span class="text-muted-foreground">— No template</span>
                                                            </button>
                                                            {#each visibleTemplates(templateSearch) as t (t.id)}
                                                                <button
                                                                    type="button"
                                                                    role="menuitem"
                                                                    onclick={() => setRowTemplate(i, t.id)}
                                                                    class="w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-left text-xs"
                                                                    class:bg-muted={item.templateId === t.id}
                                                                >
                                                                    <span>{t.icon ?? '📝'}</span>
                                                                    <span class="truncate">{t.name}</span>
                                                                </button>
                                                            {/each}
                                                            {#if visibleTemplates(templateSearch).length === 0}
                                                                <p class="px-2 py-2 text-[10px] text-muted-foreground text-center">No matches.</p>
                                                            {/if}
                                                        </div>
                                                    </div>
                                                {/if}
                                            </div>
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
