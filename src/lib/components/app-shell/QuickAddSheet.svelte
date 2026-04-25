<script lang="ts" module>
    import type { ExpandableFabTemplate } from '$lib/components/ui/expandable-fab';

    export type QuickAddSheetProps = {
        open: boolean;
        templates: ExpandableFabTemplate[];
        resolveTemplateHref: (templateId: string) => string;
        scratchHref: string;
        browseHref: string;
        onOpenChange: (open: boolean) => void;
        /** Optional: when set, renders a "Quick log" entry that calls this on click. */
        onQuickLog?: () => void;
    };
</script>

<script lang="ts">
    import { goto } from '$app/navigation';
    import * as Drawer from '$lib/components/ui/drawer';
    import FilePlus from '@lucide/svelte/icons/file-plus';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import HelpCircle from '@lucide/svelte/icons/circle-help';

    let {
        open,
        templates,
        resolveTemplateHref,
        scratchHref,
        browseHref,
        onOpenChange,
        onQuickLog,
    }: QuickAddSheetProps = $props();

    function handleQuickLog() {
        onOpenChange(false);
        onQuickLog?.();
    }

    const TOP_COUNT = 5;
    const visibleTemplates = $derived(templates.slice(0, TOP_COUNT));
    const hasTemplates = $derived(templates.length > 0);
    const browseLabel = $derived(
        templates.length > TOP_COUNT
            ? `Browse all ${templates.length} templates`
            : hasTemplates
              ? 'Browse templates'
              : '',
    );

    function navigate(href: string) {
        onOpenChange(false);
        goto(href);
    }
</script>

<Drawer.Root {open} onOpenChange={onOpenChange}>
    <Drawer.Content class="px-2 pb-6 max-h-[80vh]">
        <Drawer.Header class="text-left">
            <Drawer.Title>Add expense</Drawer.Title>
        </Drawer.Header>

        <div class="px-2">
            {#if hasTemplates}
                <p class="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Start from a template
                </p>
                <ul class="space-y-0.5 mb-3">
                    {#each visibleTemplates as t (t.id)}
                        <li>
                            <button
                                type="button"
                                onclick={() => navigate(resolveTemplateHref(t.id))}
                                class="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-accent transition-colors text-left"
                            >
                                <span class="text-xl leading-none shrink-0">{t.icon ?? '📝'}</span>
                                <div class="flex-1 min-w-0">
                                    <div class="font-medium text-sm truncate">{t.name}</div>
                                    <div class="text-xs text-muted-foreground">
                                        {t.usageCount} {t.usageCount === 1 ? 'use' : 'uses'}
                                    </div>
                                </div>
                                <ArrowRight class="size-4 text-muted-foreground shrink-0" />
                            </button>
                        </li>
                    {/each}
                </ul>
                <div class="-mx-2 my-2 h-px bg-border"></div>
            {/if}

            <ul class="space-y-0.5">
                <li>
                    <button
                        type="button"
                        onclick={() => navigate(scratchHref)}
                        class="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-accent transition-colors text-left"
                    >
                        <span class="flex items-center justify-center size-9 rounded-full bg-muted shrink-0">
                            <FilePlus class="size-4 text-muted-foreground" />
                        </span>
                        <div class="flex-1">
                            <div class="font-medium text-sm">Start from scratch</div>
                            <div class="text-xs text-muted-foreground">Blank form</div>
                        </div>
                    </button>
                </li>
                {#if onQuickLog}
                    <li>
                        <button
                            type="button"
                            onclick={handleQuickLog}
                            class="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-accent transition-colors text-left"
                        >
                            <span class="flex items-center justify-center size-9 rounded-full bg-amber-100 dark:bg-amber-950/40 shrink-0">
                                <HelpCircle class="size-4 text-amber-700 dark:text-amber-300" />
                            </span>
                            <div class="flex-1">
                                <div class="font-medium text-sm">Quick log unidentified</div>
                                <div class="text-xs text-muted-foreground">Just amount — fill details later</div>
                            </div>
                        </button>
                    </li>
                {/if}
                {#if browseLabel}
                    <li>
                        <button
                            type="button"
                            onclick={() => navigate(browseHref)}
                            class="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left rounded-md"
                        >
                            <span>{browseLabel}</span>
                            <ArrowRight class="size-3.5" />
                        </button>
                    </li>
                {/if}
            </ul>
        </div>
    </Drawer.Content>
</Drawer.Root>
