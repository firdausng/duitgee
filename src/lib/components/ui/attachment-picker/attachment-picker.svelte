<script lang="ts" module>
    export type AttachmentMeta = {
        id: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        /** UI-only state. Existing/server-loaded items render as 'ready'. */
        status?: 'uploading' | 'ready' | 'failed';
        error?: string;
    };

    /** Payload passed back to the parent form when the user applies a scan result. */
    export type ScanApplyPayload = {
        attachmentId: string;
        amount: number | null;
        currency: string | null;
        merchant: string | null;
        /** YYYY-MM-DDTHH:mm (datetime-local format) or null. */
        datetime: string | null;
        suggestedCategory: string;
        confidence: 'high' | 'medium' | 'low';
    };

    export type AttachmentPickerProps = {
        /** Vault scope — needed for upload + delete API calls. */
        vaultId: string;
        /** Selected attachment IDs (the form-submitted value). */
        value?: string[];
        /** Initial metadata for IDs already in `value` (e.g. server-loaded). */
        initial?: Array<{ id: string; fileName: string; mimeType: string; fileSize: number }>;
        disabled?: boolean;
        label?: string;
        /** Max files. Server enforces real limit; this is a UX hint. */
        maxFiles?: number;
        /** Allowed mime types for the file input. Server still validates. */
        accept?: string;
        /** Set to true on mobile to surface camera capture. */
        captureCamera?: boolean;
        /** When true, the Scan button appears next to ready image chips and the
         *  user can run AI extraction on them. Parent decides this from plan entitlement. */
        canScan?: boolean;
        /** Called when the user clicks "Apply" on a successful scan preview.
         *  Parent decides how to merge with existing form state. */
        onScanApply?: (data: ScanApplyPayload) => void;
    };
</script>

<script lang="ts">
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { ofetch } from 'ofetch';
    import { toast } from 'svelte-sonner';
    import Plus from '@lucide/svelte/icons/plus';
    import X from '@lucide/svelte/icons/x';
    import Paperclip from '@lucide/svelte/icons/paperclip';
    import FileText from '@lucide/svelte/icons/file-text';
    import Loader2 from '@lucide/svelte/icons/loader-2';
    import AlertCircle from '@lucide/svelte/icons/alert-circle';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import Download from '@lucide/svelte/icons/download';
    import Sparkles from '@lucide/svelte/icons/sparkles';
    import { cn } from '$lib/utils';

    let {
        vaultId,
        value = $bindable([]),
        initial = [],
        disabled = false,
        label = 'Receipts',
        maxFiles = 5,
        accept = 'image/jpeg,image/png,image/webp,application/pdf',
        captureCamera = false,
        canScan = false,
        onScanApply,
    }: AttachmentPickerProps = $props();

    // Internal item state — covers both server-loaded and freshly-uploaded.
    // Initialized from `initial` so edit pages show existing files immediately.
    let items = $state<AttachmentMeta[]>(
        initial.map((i) => ({ ...i, status: 'ready' as const })),
    );

    // Sync `value` (the form submission shape) with the IDs of ready items.
    $effect(() => {
        const readyIds = items.filter((i) => i.status === 'ready').map((i) => i.id);
        // Only mutate if shape differs to avoid feedback loops.
        if (
            readyIds.length !== value.length ||
            readyIds.some((id, idx) => value[idx] !== id)
        ) {
            value = readyIds;
        }
    });

    let fileInput = $state<HTMLInputElement | null>(null);
    let isDragging = $state(false);

    const isImage = (mime: string) => mime.startsWith('image/');
    const formatBytes = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const downloadUrl = (id: string) =>
        `/api/downloadAttachment?vaultId=${encodeURIComponent(vaultId)}&id=${encodeURIComponent(id)}`;

    function openFilePicker() {
        if (!disabled) fileInput?.click();
    }

    // ── Lightbox (preview) ────────────────────────────────────────────
    // Both images AND PDFs participate — images render as <img>, PDFs as
    // <iframe> using the streaming download endpoint with `Content-Disposition: inline`.
    const isPdf = (mime: string) => mime === 'application/pdf';
    const isPreviewable = (mime: string) => isImage(mime) || isPdf(mime);
    const readyPreviewable = $derived(
        items.filter((i) => i.status === 'ready' && isPreviewable(i.mimeType)),
    );
    let lightboxIndex = $state<number | null>(null);
    const lightboxItem = $derived(
        lightboxIndex !== null ? readyPreviewable[lightboxIndex] ?? null : null,
    );

    function openLightbox(item: AttachmentMeta) {
        const idx = readyPreviewable.findIndex((i) => i.id === item.id);
        if (idx >= 0) lightboxIndex = idx;
    }
    function closeLightbox() {
        lightboxIndex = null;
    }
    function lightboxPrev() {
        if (lightboxIndex === null || readyPreviewable.length === 0) return;
        lightboxIndex = (lightboxIndex - 1 + readyPreviewable.length) % readyPreviewable.length;
    }
    function lightboxNext() {
        if (lightboxIndex === null || readyPreviewable.length === 0) return;
        lightboxIndex = (lightboxIndex + 1) % readyPreviewable.length;
    }

    // Keyboard navigation while lightbox is open.
    function onLightboxKey(e: KeyboardEvent) {
        if (lightboxIndex === null) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            lightboxPrev();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            lightboxNext();
        }
    }

    function handleAttachmentClick(e: MouseEvent, item: AttachmentMeta) {
        // Non-previewable types (theoretically blocked by `accept` but defensive):
        // let the <a> open in a new tab as a fallback.
        if (!isPreviewable(item.mimeType)) return;
        // Cmd/Ctrl/Middle-click: respect the user's "open in new tab" intent.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        openLightbox(item);
    }

    // ── Scan (AI receipt extraction) ─────────────────────────────────
    // Per-attachment scan state: tracks which one is currently being scanned
    // and which ones have already been successfully scanned + applied.
    let scanningId = $state<string | null>(null);
    let appliedScanIds = $state<Set<string>>(new Set());
    let scanResult = $state<ScanApplyPayload | null>(null);
    let scanModalOpen = $state(false);

    const isScannable = (mime: string) => isImage(mime) || isPdf(mime);

    async function handleScan(item: AttachmentMeta) {
        if (!canScan || disabled) return;
        if (item.status !== 'ready') return;
        // Images and PDFs are scannable — server enforces the same.
        if (!isScannable(item.mimeType)) {
            toast.error('Scan supports JPEG, PNG, WebP images, or PDF documents');
            return;
        }
        if (scanningId) return; // already running

        scanningId = item.id;
        try {
            const response: any = await ofetch('/api/scanAttachment', {
                method: 'POST',
                body: { vaultId, attachmentId: item.id },
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.success) {
                throw new Error(response.error || 'Scan failed');
            }
            scanResult = {
                attachmentId: item.id,
                amount: response.data.amount ?? null,
                currency: response.data.currency ?? null,
                merchant: response.data.merchant ?? null,
                datetime: response.data.datetime ?? null,
                suggestedCategory: response.data.suggestedCategory ?? 'Misc',
                confidence: response.data.confidence ?? 'medium',
            };
            scanModalOpen = true;
        } catch (err: any) {
            const msg = err?.data?.error || err?.message || 'Scan failed';
            toast.error(msg);
        } finally {
            scanningId = null;
        }
    }

    function applyScanResult() {
        if (!scanResult || !onScanApply) {
            scanModalOpen = false;
            return;
        }
        onScanApply(scanResult);
        appliedScanIds = new Set([...appliedScanIds, scanResult.attachmentId]);
        scanModalOpen = false;
        scanResult = null;
    }

    function dismissScanResult() {
        scanModalOpen = false;
        scanResult = null;
    }

    const confidenceLabel = (c: 'high' | 'medium' | 'low'): string =>
        c === 'high' ? 'Likely correct' : c === 'medium' ? 'Worth a quick check' : 'Verify carefully';
    const confidenceClass = (c: 'high' | 'medium' | 'low'): string =>
        c === 'high'
            ? 'text-emerald-700 dark:text-emerald-400'
            : c === 'medium'
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-rose-700 dark:text-rose-400';

    function onFileInputChange(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            handleFiles(Array.from(input.files));
        }
        input.value = ''; // allow re-uploading the same file later
    }

    async function handleFiles(files: File[]) {
        if (disabled) return;

        const slotsLeft = Math.max(0, maxFiles - items.length);
        if (slotsLeft <= 0) {
            toast.error(`Already at the ${maxFiles}-attachment limit`);
            return;
        }
        if (files.length > slotsLeft) {
            toast.warning(`Only the first ${slotsLeft} of ${files.length} files will be uploaded`);
            files = files.slice(0, slotsLeft);
        }

        // Insert placeholder items immediately so the user sees progress.
        const placeholderItems = files.map((file): AttachmentMeta => ({
            id: `tmp-${crypto.randomUUID()}`, // temporary; replaced when upload returns
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            status: 'uploading',
        }));
        items = [...items, ...placeholderItems];

        // Upload sequentially to avoid burning Worker subrequest budget on huge batches.
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const placeholder = placeholderItems[i];
            try {
                const params = new URLSearchParams({
                    vaultId,
                    fileName: file.name,
                    mimeType: file.type,
                });
                const response = await ofetch(`/api/uploadAttachment?${params.toString()}`, {
                    method: 'POST',
                    body: file,
                    headers: {
                        'Content-Type': file.type,
                        'Content-Length': String(file.size),
                    },
                });

                if (!response.success) {
                    throw new Error(response.error || 'Upload failed');
                }

                // Replace placeholder with the real attachment metadata.
                items = items.map((it) =>
                    it.id === placeholder.id
                        ? {
                              id: response.data.id,
                              fileName: response.data.fileName,
                              mimeType: response.data.mimeType,
                              fileSize: response.data.fileSize,
                              status: 'ready' as const,
                          }
                        : it,
                );
            } catch (err: any) {
                const errorMessage = err?.data?.error || err?.message || 'Upload failed';
                items = items.map((it) =>
                    it.id === placeholder.id
                        ? { ...it, status: 'failed', error: errorMessage }
                        : it,
                );
                toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
            }
        }
    }

    async function removeItem(item: AttachmentMeta) {
        if (disabled) return;

        // Failed/uploading placeholders aren't on the server yet — drop locally.
        if (item.status !== 'ready') {
            items = items.filter((it) => it.id !== item.id);
            return;
        }

        // Optimistically remove; restore on error.
        const removed = items;
        items = items.filter((it) => it.id !== item.id);

        try {
            const response = await ofetch('/api/deleteAttachment', {
                method: 'POST',
                body: { id: item.id, vaultId },
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.success) {
                throw new Error(response.error || 'Delete failed');
            }
        } catch (err: any) {
            const errorMessage = err?.data?.error || err?.message || 'Delete failed';
            toast.error(errorMessage);
            items = removed; // restore
        }
    }

    function onDragEnter(e: DragEvent) {
        if (disabled) return;
        e.preventDefault();
        isDragging = true;
    }
    function onDragLeave(e: DragEvent) {
        if (disabled) return;
        // Only clear when the cursor exits the wrapper, not when entering a child.
        if (e.currentTarget instanceof HTMLElement && e.relatedTarget instanceof Node) {
            if (e.currentTarget.contains(e.relatedTarget)) return;
        }
        isDragging = false;
    }
    function onDragOver(e: DragEvent) {
        if (disabled) return;
        e.preventDefault();
    }
    function onDrop(e: DragEvent) {
        if (disabled) return;
        e.preventDefault();
        isDragging = false;
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFiles(Array.from(files));
        }
    }
</script>

<div class="space-y-2">
    {#if label}
        <Label>{label}</Label>
    {/if}

    <input
        type="file"
        bind:this={fileInput}
        onchange={onFileInputChange}
        {accept}
        capture={captureCamera ? 'environment' : undefined}
        multiple
        class="hidden"
    />

    <!-- Wrapper handles drag-and-drop. Visual highlight when actively dragging. -->
    <div
        class={cn(
            'rounded-md border border-input bg-background p-1.5 min-h-[2.5rem] transition-colors',
            isDragging ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : '',
        )}
        ondragenter={onDragEnter}
        ondragleave={onDragLeave}
        ondragover={onDragOver}
        ondrop={onDrop}
        role="region"
        aria-label="Drop files to attach"
    >
        <div class="flex flex-wrap items-center gap-1.5">
            {#each items as item (item.id)}
                <div
                    class={cn(
                        'group relative inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs border',
                        item.status === 'ready'
                            ? 'bg-muted text-foreground border-transparent'
                            : item.status === 'uploading'
                              ? 'bg-muted/50 text-muted-foreground border-dashed border-muted-foreground/40'
                              : 'bg-destructive/10 text-destructive border-destructive/30',
                    )}
                    title={item.error || `${item.fileName} · ${formatBytes(item.fileSize)}`}
                >
                    {#if item.status === 'uploading'}
                        <!-- Uploading: spinner + filename, no link -->
                        <Loader2 class="size-4 animate-spin shrink-0" />
                        <div class="flex flex-col min-w-0 max-w-[12rem]">
                            <span class="truncate font-medium">{item.fileName}</span>
                            <span class="text-[10px] opacity-75">
                                {formatBytes(item.fileSize)}
                            </span>
                        </div>
                    {:else if item.status === 'failed'}
                        <!-- Failed: alert icon + filename, no link -->
                        <AlertCircle class="size-4 shrink-0" />
                        <div class="flex flex-col min-w-0 max-w-[12rem]">
                            <span class="truncate font-medium">{item.fileName}</span>
                            <span class="text-[10px] opacity-75">
                                {item.error ?? formatBytes(item.fileSize)}
                            </span>
                        </div>
                    {:else}
                        <!-- Ready: entire row (thumbnail + filename) is one big click target.
                             For images, click opens the lightbox; for PDFs, opens in new tab.
                             Cmd/Ctrl-click always opens in new tab regardless of file type. -->
                        <a
                            href={downloadUrl(item.id)}
                            target="_blank"
                            rel="noopener"
                            aria-label={`Open ${item.fileName}`}
                            onclick={(e) => handleAttachmentClick(e, item)}
                            class="inline-flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                        >
                            {#if isImage(item.mimeType)}
                                <img
                                    src={downloadUrl(item.id)}
                                    alt=""
                                    class="size-8 object-cover rounded shrink-0"
                                    loading="lazy"
                                />
                            {:else}
                                <span class="shrink-0 inline-flex items-center justify-center size-8 rounded bg-background">
                                    <FileText class="size-4" />
                                </span>
                            {/if}
                            <div class="flex flex-col min-w-0 max-w-[12rem]">
                                <span class="truncate font-medium">{item.fileName}</span>
                                <span class="text-[10px] opacity-75">
                                    {formatBytes(item.fileSize)}
                                </span>
                            </div>
                        </a>
                    {/if}

                    <!-- Scan button — on ready images & PDFs when canScan is on.
                         Successful scans get a small ✨ indicator; subsequent clicks
                         re-open the cached preview from the server-side dedupe cache. -->
                    {#if item.status === 'ready' && isScannable(item.mimeType) && canScan}
                        <button
                            type="button"
                            onclick={() => handleScan(item)}
                            disabled={disabled || scanningId !== null}
                            class={cn(
                                'ml-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                                appliedScanIds.has(item.id)
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-primary/10 text-primary hover:bg-primary/20',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                            )}
                            aria-label={appliedScanIds.has(item.id) ? 'Re-scan' : `Scan ${item.fileName}`}
                            title={appliedScanIds.has(item.id) ? 'Re-scan receipt' : 'Scan receipt'}
                        >
                            {#if scanningId === item.id}
                                <Loader2 class="size-3 animate-spin" />
                            {:else}
                                <Sparkles class="size-3" />
                            {/if}
                            {#if appliedScanIds.has(item.id)}
                                <span>Scanned</span>
                            {:else}
                                <span>Scan</span>
                            {/if}
                        </button>
                    {/if}

                    <button
                        type="button"
                        onclick={() => removeItem(item)}
                        {disabled}
                        class="ml-1 hover:opacity-70 disabled:opacity-50"
                        aria-label={`Remove ${item.fileName}`}
                        title="Remove"
                    >
                        <X class="size-3" />
                    </button>
                </div>
            {/each}

            {#if items.length < maxFiles}
                <button
                    type="button"
                    onclick={openFilePicker}
                    {disabled}
                    class={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-dashed text-muted-foreground hover:bg-accent hover:text-foreground',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                >
                    <Plus class="size-3" />
                    {items.length === 0 ? 'Attach file' : 'Add another'}
                </button>
            {/if}

            {#if items.length === 0}
                <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Paperclip class="size-3" />
                    Drop files here or click to attach
                </span>
            {/if}
        </div>
    </div>
</div>

<!-- Image lightbox — overlays the whole viewport when an image is opened. -->
<svelte:window onkeydown={onLightboxKey} />

{#if lightboxItem}
    <!-- Backdrop click closes; image click does nothing (event stops on the image container). -->
    <div
        role="dialog"
        aria-modal="true"
        aria-label={`Viewing ${lightboxItem.fileName}`}
        onclick={closeLightbox}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') closeLightbox(); }}
        class="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        tabindex="-1"
    >
        <!-- Preview container — stops click propagation so clicks inside don't close. -->
        <div
            role="presentation"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            class="relative max-w-full max-h-full flex flex-col items-center w-full"
        >
            {#if isImage(lightboxItem.mimeType)}
                <img
                    src={downloadUrl(lightboxItem.id)}
                    alt={lightboxItem.fileName}
                    class="max-w-full max-h-[calc(100vh-8rem)] object-contain rounded-md shadow-2xl"
                />
            {:else if isPdf(lightboxItem.mimeType)}
                <!-- PDF viewer — iframe pointing at our streaming endpoint.
                     Browsers with built-in PDF viewers (Chrome, Firefox, Safari, modern
                     mobile browsers) render it inline. The endpoint sets
                     `Content-Disposition: inline` so the browser doesn't force download. -->
                <iframe
                    src={downloadUrl(lightboxItem.id)}
                    title={lightboxItem.fileName}
                    class="bg-white rounded-md shadow-2xl w-[min(100vw-2rem,80rem)] h-[calc(100vh-8rem)]"
                ></iframe>
            {/if}

            <!-- Caption + actions — fixed under the preview for clarity. -->
            <div class="mt-3 flex items-center gap-2 text-white flex-wrap justify-center">
                <span class="text-sm font-medium truncate max-w-[60vw]">{lightboxItem.fileName}</span>
                <span class="text-xs opacity-70">· {formatBytes(lightboxItem.fileSize)}</span>
                {#if readyPreviewable.length > 1}
                    <span class="text-xs opacity-70">· {(lightboxIndex ?? 0) + 1} / {readyPreviewable.length}</span>
                {/if}
                <a
                    href={downloadUrl(lightboxItem.id)}
                    target="_blank"
                    rel="noopener"
                    download={lightboxItem.fileName}
                    class="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-white/10 hover:bg-white/20 transition-colors"
                    title="Download"
                    onclick={(e) => e.stopPropagation()}
                >
                    <Download class="size-3.5" />
                    Download
                </a>
            </div>
        </div>

        <!-- Close button — top right -->
        <button
            type="button"
            onclick={closeLightbox}
            class="absolute top-4 right-4 inline-flex items-center justify-center size-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close (Esc)"
            aria-label="Close"
        >
            <X class="size-5" />
        </button>

        <!-- Prev / Next arrows when there are multiple previewable items (images + PDFs) -->
        {#if readyPreviewable.length > 1}
            <button
                type="button"
                onclick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                class="absolute left-4 top-1/2 -translate-y-1/2 inline-flex items-center justify-center size-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Previous (←)"
                aria-label="Previous"
            >
                <ChevronLeft class="size-5" />
            </button>
            <button
                type="button"
                onclick={(e) => { e.stopPropagation(); lightboxNext(); }}
                class="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center justify-center size-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Next (→)"
                aria-label="Next"
            >
                <ChevronRight class="size-5" />
            </button>
        {/if}
    </div>
{/if}

<!-- Scan preview — modal overlay showing extracted fields with Apply / Cancel. -->
{#if scanModalOpen && scanResult}
    <div
        role="dialog"
        aria-modal="true"
        aria-label="Receipt scan preview"
        onclick={dismissScanResult}
        onkeydown={(e) => { if (e.key === 'Escape') dismissScanResult(); }}
        class="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        tabindex="-1"
    >
        <div
            role="presentation"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            class="bg-card rounded-[var(--radius-md)] border shadow-2xl w-full max-w-md overflow-hidden"
        >
            <!-- Header -->
            <div class="px-4 py-3 border-b flex items-center gap-2">
                <Sparkles class="size-4 text-primary" />
                <h3 class="font-semibold text-base flex-1">Scanned receipt</h3>
                <button
                    type="button"
                    onclick={dismissScanResult}
                    class="text-muted-foreground hover:text-foreground"
                    aria-label="Close"
                >
                    <X class="size-4" />
                </button>
            </div>

            <!-- Extracted fields — read-only summary -->
            <div class="p-4 space-y-3 text-sm">
                <div class="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2">
                    <span class="text-muted-foreground">Amount</span>
                    <span class="font-medium tabular-nums">
                        {#if scanResult.amount !== null}
                            {scanResult.currency ? `${scanResult.currency} ` : ''}{scanResult.amount.toFixed(2)}
                        {:else}
                            <span class="text-muted-foreground italic">Not detected</span>
                        {/if}
                    </span>

                    <span class="text-muted-foreground">Merchant</span>
                    <span class="font-medium truncate">
                        {#if scanResult.merchant}
                            {scanResult.merchant}
                        {:else}
                            <span class="text-muted-foreground italic">Not detected</span>
                        {/if}
                    </span>

                    <span class="text-muted-foreground">Date</span>
                    <span class="font-medium">
                        {#if scanResult.datetime}
                            {scanResult.datetime.replace('T', ' · ')}
                        {:else}
                            <span class="text-muted-foreground italic">Not detected</span>
                        {/if}
                    </span>

                    <span class="text-muted-foreground">Category</span>
                    <span class="font-medium">{scanResult.suggestedCategory}</span>
                </div>

                <div class="pt-2 border-t flex items-center gap-2">
                    <span class="text-xs text-muted-foreground">Confidence:</span>
                    <span class={cn('text-xs font-semibold', confidenceClass(scanResult.confidence))}>
                        {confidenceLabel(scanResult.confidence)}
                    </span>
                </div>

                <p class="text-xs text-muted-foreground">
                    Existing form values are preserved. Empty fields will be filled in.
                </p>
            </div>

            <!-- Actions -->
            <div class="px-4 py-3 border-t flex items-center justify-end gap-2 bg-muted/20">
                <Button type="button" variant="outline" size="sm" onclick={dismissScanResult}>
                    Cancel
                </Button>
                <Button type="button" size="sm" onclick={applyScanResult}>
                    Apply to form
                </Button>
            </div>
        </div>
    </div>
{/if}
