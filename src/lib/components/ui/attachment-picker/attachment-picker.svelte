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
    };
</script>

<script lang="ts">
    import { Label } from '$lib/components/ui/label';
    import { ofetch } from 'ofetch';
    import { toast } from 'svelte-sonner';
    import Plus from '@lucide/svelte/icons/plus';
    import X from '@lucide/svelte/icons/x';
    import Paperclip from '@lucide/svelte/icons/paperclip';
    import FileText from '@lucide/svelte/icons/file-text';
    import Loader2 from '@lucide/svelte/icons/loader-2';
    import AlertCircle from '@lucide/svelte/icons/alert-circle';
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
                    <!-- Thumbnail / icon -->
                    {#if item.status === 'uploading'}
                        <Loader2 class="size-4 animate-spin shrink-0" />
                    {:else if item.status === 'failed'}
                        <AlertCircle class="size-4 shrink-0" />
                    {:else if isImage(item.mimeType)}
                        <a
                            href={downloadUrl(item.id)}
                            target="_blank"
                            rel="noopener"
                            class="shrink-0"
                            aria-label={`Open ${item.fileName}`}
                        >
                            <img
                                src={downloadUrl(item.id)}
                                alt={item.fileName}
                                class="size-8 object-cover rounded"
                                loading="lazy"
                            />
                        </a>
                    {:else}
                        <a
                            href={downloadUrl(item.id)}
                            target="_blank"
                            rel="noopener"
                            class="shrink-0 inline-flex items-center justify-center size-8 rounded bg-background"
                            aria-label={`Open ${item.fileName}`}
                        >
                            <FileText class="size-4" />
                        </a>
                    {/if}

                    <div class="flex flex-col min-w-0 max-w-[12rem]">
                        <span class="truncate font-medium">{item.fileName}</span>
                        <span class="text-[10px] opacity-75">
                            {formatBytes(item.fileSize)}
                        </span>
                    </div>

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
