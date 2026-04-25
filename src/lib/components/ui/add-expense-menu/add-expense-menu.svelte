<script lang="ts" module>
    export interface AddExpenseMenuTemplate {
        id: string;
        name: string;
        icon: string | null;
        usageCount: number;
    }

    export interface AddExpenseMenuProps {
        /** Templates to show as top-level shortcut chips. Pass the most-used first. */
        templates: AddExpenseMenuTemplate[];
        /** Route to navigate to when the user picks a template. Receives (templateId) → string. */
        resolveTemplateHref: (templateId: string) => string;
        /** Route for the "Start from scratch" / blank-form path. */
        scratchHref: string;
        /** Route for the full browse-all-templates page. */
        browseHref: string;
        /** When true the button renders but is disabled. */
        disabled?: boolean;
        /** Where the popover panel should anchor relative to the button. Default 'bottom'
         *  for header use; the legacy floating FAB used 'top'. */
        anchor?: 'top' | 'bottom';
        class?: string;
    }
</script>

<script lang="ts">
    import { page } from '$app/state';
    import { cn } from '$lib/utils';
    import Plus from '@lucide/svelte/icons/plus';
    import ChevronUp from '@lucide/svelte/icons/chevron-up';
    import FilePlus from '@lucide/svelte/icons/file-plus';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';

    let {
        templates,
        resolveTemplateHref,
        scratchHref,
        browseHref,
        disabled = false,
        anchor = 'bottom',
        class: className,
    }: AddExpenseMenuProps = $props();

    let open = $state(false);
    let popoverRef: HTMLDivElement | null = $state(null);
    let triggerRef: HTMLButtonElement | null = $state(null);

    const hasTemplates = $derived(templates.length > 0);
    const TOP_COUNT = 5;
    const visibleTemplates = $derived(templates.slice(0, TOP_COUNT));
    const browseLabel = $derived(
        templates.length > TOP_COUNT
            ? `Browse all ${templates.length} templates`
            : hasTemplates
              ? 'Browse templates'
              : '',
    );

    function toggle() {
        if (disabled) return;
        if (!hasTemplates) {
            // No templates — skip the popover and go straight to scratch.
            window.location.href = scratchHref;
            return;
        }
        open = !open;
    }

    function close() {
        open = false;
    }

    function onDocumentClick(e: MouseEvent) {
        if (!open) return;
        const target = e.target as Node;
        if (popoverRef?.contains(target)) return;
        if (triggerRef?.contains(target)) return;
        close();
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && open) {
            close();
            triggerRef?.focus();
        }
    }

    // Close when the route changes (user tapped a link in the popover).
    $effect(() => {
        page.url.pathname; // track
        page.url.search;
        close();
    });
</script>

<svelte:document onclick={onDocumentClick} onkeydown={onKeydown} />

<div class={cn('relative inline-flex', className)}>
    <!-- Trigger button — primary filled, sized to fit a desktop header -->
    <button
        bind:this={triggerRef}
        type="button"
        {disabled}
        onclick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Close quick add' : 'Add expense'}
        class={cn(
            'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-sm)]',
            'bg-primary text-primary-foreground font-medium text-sm',
            'transition-colors hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
    >
        {#if open}
            <ChevronUp class="size-4" />
        {:else}
            <Plus class="size-4" />
        {/if}
        <span>Add expense</span>
    </button>

    <!-- Popover panel -->
    {#if open && hasTemplates}
        <div
            bind:this={popoverRef}
            role="menu"
            class={cn(
                'absolute right-0 w-72 rounded-[var(--radius-md)] border bg-popover text-popover-foreground shadow-lg overflow-hidden z-50',
                anchor === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
            )}
            style="animation: aem-pop-in 150ms var(--ease-out);"
        >
            <div class="px-3 py-2 border-b">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Start from a template
                </p>
            </div>
            <div class="py-1">
                {#each visibleTemplates as t (t.id)}
                    <a
                        href={resolveTemplateHref(t.id)}
                        role="menuitem"
                        class="flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors"
                    >
                        <span class="text-xl leading-none shrink-0">{t.icon ?? '📝'}</span>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium truncate" title={t.name}>{t.name}</div>
                            <div class="text-xs text-muted-foreground">
                                {t.usageCount} {t.usageCount === 1 ? 'use' : 'uses'}
                            </div>
                        </div>
                        <ArrowRight class="size-4 text-muted-foreground shrink-0" />
                    </a>
                {/each}
            </div>
            <div class="border-t py-1">
                <a
                    href={scratchHref}
                    role="menuitem"
                    class="flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors"
                >
                    <span class="flex items-center justify-center size-7 rounded-full bg-muted shrink-0">
                        <FilePlus class="size-4 text-muted-foreground" />
                    </span>
                    <div class="flex-1">
                        <div class="font-medium">Start from scratch</div>
                        <div class="text-xs text-muted-foreground">Blank form</div>
                    </div>
                </a>
                {#if browseLabel}
                    <a
                        href={browseHref}
                        role="menuitem"
                        class="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <span>{browseLabel}</span>
                        <ArrowRight class="size-3.5" />
                    </a>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    @keyframes aem-pop-in {
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
