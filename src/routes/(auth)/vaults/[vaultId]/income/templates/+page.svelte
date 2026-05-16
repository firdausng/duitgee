<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { ofetch } from 'ofetch';
    import { resource } from 'runed';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Textarea } from '$lib/components/ui/textarea';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { EmptyState } from '$lib/components/ui/empty-state';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { Toaster } from '$lib/components/ui/sonner';
    import { CalculatorInput } from '$lib/components/ui/calculator-input';
    import * as Select from '$lib/components/ui/select';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import { IconCombobox } from '$lib/components/ui/icon-combobox';
    import { iconData } from '$lib/configurations/icons';
    import { toast } from 'svelte-sonner';
    import Plus from '@lucide/svelte/icons/plus';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import FileText from '@lucide/svelte/icons/file-text';
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import Link2 from '@lucide/svelte/icons/link-2';
    import Repeat from '@lucide/svelte/icons/repeat';
    import MoreVertical from '@lucide/svelte/icons/more-vertical';

    let { data } = $props();
    const vaultId = $derived(page.params.vaultId);

    type Source = { id: string; name: string; icon: string | null };
    type Template = {
        id: string;
        sourceId: string;
        name: string;
        icon: string | null;
        defaultAmount: number | null;
        defaultPaidTo: string | null;
        defaultFundId: string | null;
        defaultNote: string | null;
        previousTemplateId: string | null;
        endedAt: string | null;
        usageCount: number;
        lastUsedAt: string | null;
        source: { name: string | null; icon: string | null };
        previousTemplate: { id: string; name: string; icon: string | null; endedAt: string | null } | null;
    };

    let refetchKey = $state(0);

    const sourcesResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const res = await ofetch<{ success: boolean; data: Source[] }>(
                `/api/getIncomeSources?vaultId=${id}`,
            );
            return res.data ?? [];
        },
    );

    const templatesResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            const res = await ofetch<{ success: boolean; data: Template[] }>(
                `/api/getIncomeTemplates?vaultId=${id}`,
            );
            return res.data ?? [];
        },
    );

    const sources = $derived(sourcesResource.current ?? []);
    const templates = $derived(templatesResource.current ?? []);
    const activeTemplates = $derived(templates.filter((t) => !t.endedAt));
    const endedTemplates = $derived(templates.filter((t) => t.endedAt));
    const isLoading = $derived(sourcesResource.loading || templatesResource.loading);

    let showEnded = $state(false);

    // Inline form state
    let editingId = $state<string | null>(null);
    let isCreating = $state(false);
    let formSourceId = $state<string>('');
    let formName = $state('');
    let formIcon = $state('💰');
    let formAmount = $state<number | undefined>(undefined);
    let formPaidTo = $state<string | null>(null);
    let formFundId = $state<string | null>(null);
    let formNote = $state('');
    // Lineage — set when creating a continuation. Pre-filled by Replace flow
    // or by the `?continueFrom=<id>` query param.
    let formPreviousTemplateId = $state<string | null>(null);
    let saving = $state(false);

    // Link-to-previous picker (separate from the create-with-lineage flow)
    let linkingTemplate = $state<Template | null>(null);
    let linkSelection = $state<string | null>(null);

    function startCreate(opts?: { fromTemplate?: Template; previousId?: string | null }) {
        editingId = null;
        isCreating = true;
        formPreviousTemplateId = opts?.previousId ?? null;
        const from = opts?.fromTemplate;
        formSourceId = from?.sourceId ?? sources[0]?.id ?? '';
        formName = from?.name ?? '';
        formIcon = from?.icon ?? '💰';
        formAmount = from?.defaultAmount ?? undefined;
        formPaidTo = from?.defaultPaidTo ?? null;
        formFundId = from?.defaultFundId ?? null;
        formNote = from?.defaultNote ?? '';
    }

    function startEdit(t: Template) {
        isCreating = false;
        editingId = t.id;
        formPreviousTemplateId = t.previousTemplateId;
        formSourceId = t.sourceId;
        formName = t.name;
        formIcon = t.icon ?? '💰';
        formAmount = t.defaultAmount ?? undefined;
        formPaidTo = t.defaultPaidTo;
        formFundId = t.defaultFundId;
        formNote = t.defaultNote ?? '';
    }

    function cancelEdit() {
        if (saving) return;
        isCreating = false;
        editingId = null;
        formPreviousTemplateId = null;
    }

    async function saveForm() {
        if (!formSourceId) {
            toast.error('Pick a source');
            return;
        }
        if (!formName.trim()) {
            toast.error('Enter a name');
            return;
        }
        saving = true;
        try {
            const body: Record<string, unknown> = {
                vaultId,
                sourceId: formSourceId,
                name: formName.trim(),
                icon: formIcon,
                defaultAmount: formAmount ?? null,
                defaultPaidTo: formPaidTo,
                defaultFundId: formFundId,
                defaultNote: formNote.trim() || null,
            };
            if (isCreating) {
                body.previousTemplateId = formPreviousTemplateId;
                await ofetch('/api/createIncomeTemplate', {
                    method: 'POST',
                    body,
                    headers: { 'Content-Type': 'application/json' },
                });
                toast.success(
                    formPreviousTemplateId ? 'Template created · linked to previous' : 'Template created',
                );
            } else if (editingId) {
                body.id = editingId;
                await ofetch('/api/updateIncomeTemplate', {
                    method: 'POST',
                    body,
                    headers: { 'Content-Type': 'application/json' },
                });
                toast.success('Template updated');
            }
            isCreating = false;
            editingId = null;
            formPreviousTemplateId = null;
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to save');
        } finally {
            saving = false;
        }
    }

    async function handleDelete(t: Template) {
        if (!confirm(`Delete template "${t.name}"? Existing entries keep their record but lose the template label.`)) return;
        try {
            await ofetch('/api/deleteIncomeTemplate', {
                method: 'POST',
                body: { vaultId, id: t.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Template deleted');
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to delete');
        }
    }

    async function handleReplace(t: Template) {
        const ok = confirm(
            `Replace "${t.name}"? This template will be marked ended (hidden from pickers) and a new one will be pre-filled, ready for you to adjust. Use this when an income stream ends (e.g. you changed jobs).`,
        );
        if (!ok) return;
        try {
            await ofetch('/api/replaceIncomeTemplate', {
                method: 'POST',
                body: { vaultId, id: t.id },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Old template ended · review and save the new one');
            // Start a new template pre-filled from the old, with lineage set.
            startCreate({ fromTemplate: t, previousId: t.id });
            // Trigger refetch so the just-ended template appears in the Ended section.
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to replace');
        }
    }

    function openLinkPicker(t: Template) {
        linkingTemplate = t;
        linkSelection = t.previousTemplateId;
    }

    function closeLinkPicker() {
        linkingTemplate = null;
        linkSelection = null;
    }

    async function confirmLink() {
        if (!linkingTemplate) return;
        // Block self-link defensively (server also enforces).
        if (linkSelection === linkingTemplate.id) {
            toast.error('A template cannot reference itself');
            return;
        }
        try {
            await ofetch('/api/linkIncomeTemplate', {
                method: 'POST',
                body: {
                    vaultId,
                    id: linkingTemplate.id,
                    previousTemplateId: linkSelection,
                },
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success(linkSelection ? 'Linked to previous template' : 'Lineage link cleared');
            closeLinkPicker();
            refetchKey++;
        } catch (error: any) {
            toast.error(error?.data?.error || error?.message || 'Failed to update link');
        }
    }

    // Link picker: candidates are every template except the current one, with
    // its descendants pruned client-side to keep the cycle check obvious.
    const linkCandidates = $derived.by(() => {
        const lt = linkingTemplate;
        if (!lt) return [];
        return templates
            .filter((t) => t.id !== lt.id)
            .filter((t) => !isAncestorOf(lt.id, t))
            .sort((a, b) => (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? ''));
    });

    // Walk up `candidate`'s ancestor chain — if we hit `wouldBeAncestor`,
    // attaching it would create a loop.
    function isAncestorOf(wouldBeAncestor: string, candidate: Template): boolean {
        let cursor: string | null = candidate.previousTemplateId;
        let hops = 0;
        while (cursor && hops < 32) {
            if (cursor === wouldBeAncestor) return true;
            const parent = templates.find((t) => t.id === cursor);
            cursor = parent?.previousTemplateId ?? null;
            hops++;
        }
        return false;
    }

    const sourceLabel = $derived((id: string) => sources.find((s) => s.id === id)?.name ?? 'Source');

    onMount(() => {
        // Honour the ?continueFrom=<id> deep-link from the income list, etc.
        const continueFromId = page.url.searchParams.get('continueFrom');
        if (continueFromId) {
            // Wait until templates load, then start a create.
            const stop = $effect.root(() => {
                $effect(() => {
                    const src = templates.find((t) => t.id === continueFromId);
                    if (src) {
                        startCreate({ fromTemplate: src, previousId: src.id });
                        stop();
                    }
                });
            });
        }
    });

    function previousPickerName(): string {
        if (!linkSelection) return 'None — not a continuation';
        const t = templates.find((x) => x.id === linkSelection);
        return t ? t.name : 'Unknown';
    }
</script>

<svelte:head>
    <title>Income Templates - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-6 px-4 [&>*+*]:mt-6">
    <div class="flex items-end gap-2 mb-2">
        <header class="flex-1">
            <button
                type="button"
                onclick={() => goto(`/vaults/${vaultId}/income`)}
                class="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"
            >
                <ArrowLeft class="size-3" />
                Back to income
            </button>
            <Eyebrow tone="muted">— The household ledger —</Eyebrow>
            <h1 class="dg-page-title">Income <em>templates</em>.</h1>
            <p class="dg-page-sub">Reusable pre-fills tied to a source. One per recurring stream — e.g. "Salary — main job", "Quarterly bonus".</p>
        </header>
        {#if !isCreating && editingId === null}
            <Button size="sm" onclick={() => startCreate()} disabled={sources.length === 0}>
                <Plus class="size-4" />
                <span>New template</span>
            </Button>
        {/if}
    </div>
    <Rule variant="double" />

    {#if sources.length === 0}
        <Card>
            <CardContent class="py-6 text-center space-y-3">
                <p class="text-sm text-muted-foreground">Create at least one source first — templates reference a source.</p>
                <Button size="sm" variant="outline" onclick={() => goto(`/vaults/${vaultId}/income/sources`)}>
                    Manage sources
                </Button>
            </CardContent>
        </Card>
    {/if}

    {#if isCreating || editingId !== null}
        <Card>
            <CardContent class="py-4 space-y-4">
                <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {isCreating ? 'New template' : 'Edit template'}
                </p>
                {#if isCreating && formPreviousTemplateId}
                    {@const prev = templates.find((t) => t.id === formPreviousTemplateId)}
                    {#if prev}
                        <div class="rounded-md border border-dashed bg-primary/5 border-primary/30 p-2.5 flex items-start gap-2 text-xs">
                            <Link2 class="size-3.5 mt-0.5 shrink-0 text-primary" />
                            <p>
                                Continues from <span class="font-medium">{prev.name}</span>. The new template will be linked as the same income lineage.
                            </p>
                        </div>
                    {/if}
                {/if}
                <div class="grid gap-3 sm:grid-cols-2">
                    <div class="space-y-1">
                        <Label for="tpl-source">Source <span class="text-destructive">*</span></Label>
                        <input type="hidden" name="sourceId" value={formSourceId} />
                        <Select.Root
                            type="single"
                            value={formSourceId}
                            onValueChange={(v: string | undefined) => (formSourceId = v ?? '')}
                        >
                            <Select.Trigger id="tpl-source" class="w-full" disabled={saving}>
                                {sourceLabel(formSourceId)}
                            </Select.Trigger>
                            <Select.Content>
                                {#each sources as src}
                                    <Select.Item value={src.id} label={src.name} />
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div class="space-y-1">
                        <Label for="tpl-name">Name <span class="text-destructive">*</span></Label>
                        <Input id="tpl-name" bind:value={formName} disabled={saving} placeholder="e.g., Salary - Firdaus" />
                    </div>
                </div>
                <IconCombobox
                    name="tpl-icon"
                    label="Icon"
                    icons={iconData.icons}
                    bind:value={formIcon}
                    disabled={saving}
                    placeholder="Search icons..."
                />

                <div class="grid gap-3 sm:grid-cols-2">
                    <div class="space-y-1">
                        <Label for="tpl-amount">Default amount</Label>
                        <CalculatorInput id="tpl-amount" bind:value={formAmount} disabled={saving} placeholder="0.00" />
                    </div>
                    {#if data.funds.length > 0}
                        <div class="space-y-1">
                            <Label>Default fund top-up</Label>
                            <Select.Root
                                type="single"
                                value={formFundId ?? ''}
                                onValueChange={(v: string | undefined) => (formFundId = v || null)}
                            >
                                <Select.Trigger class="w-full" disabled={saving}>
                                    {data.funds.find((f) => f.id === formFundId)?.name ?? '— none —'}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="" label="— none —" />
                                    {#each data.funds as fund}
                                        <Select.Item value={fund.id} label={fund.name} />
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>
                    {/if}
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                    <div class="space-y-1">
                        <Label>Default paid to</Label>
                        <Select.Root
                            type="single"
                            value={formPaidTo ?? ''}
                            onValueChange={(v: string | undefined) => (formPaidTo = v || null)}
                        >
                            <Select.Trigger class="w-full" disabled={saving}>
                                {data.members.find((m) => m.userId === formPaidTo)?.displayName ?? 'Vault-level'}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="" label="Vault-level" />
                                {#each data.members as member}
                                    <Select.Item value={member.userId} label={member.displayName} />
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div class="space-y-1">
                        <Label for="tpl-note">Default note</Label>
                        <Textarea id="tpl-note" bind:value={formNote} disabled={saving} rows={2} placeholder="Optional context" />
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onclick={cancelEdit} disabled={saving}>Cancel</Button>
                    <Button size="sm" onclick={saveForm} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                </div>
            </CardContent>
        </Card>
    {/if}

    {#if isLoading && templates.length === 0}
        <div class="flex justify-center py-16">
            <div class="animate-spin rounded-full size-10 border-b-2 border-primary"></div>
        </div>
    {:else if templates.length === 0 && sources.length > 0 && !isCreating}
        <Card>
            <CardContent class="py-10">
                <EmptyState
                    icon={FileText}
                    title="No templates yet"
                    description="Templates pre-fill the new-income form. Useful for recurring streams like salary, retirement withdrawals, or regular side income."
                >
                    {#snippet primary()}
                        <Button size="sm" onclick={() => startCreate()}>
                            <Plus class="size-4" />
                            New template
                        </Button>
                    {/snippet}
                </EmptyState>
            </CardContent>
        </Card>
    {:else if templates.length > 0}
        {#snippet row(tpl: Template, muted: boolean)}
            <div class="flex items-center gap-3 px-3 py-2.5 {muted ? 'opacity-70' : ''}">
                <span class="text-xl leading-none shrink-0" aria-hidden="true">{tpl.icon ?? '💰'}</span>
                <div class="flex-1 min-w-0">
                    <p class="font-medium break-words">
                        {tpl.name}
                        {#if tpl.endedAt}
                            <span class="inline-flex items-center text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 align-middle ml-1.5 bg-muted text-muted-foreground">ended</span>
                        {/if}
                    </p>
                    <p class="text-xs text-muted-foreground mt-0.5 flex items-center flex-wrap gap-1">
                        <span class="inline-flex items-center gap-1">
                            <span aria-hidden="true">{tpl.source.icon ?? '💰'}</span>
                            {tpl.source.name ?? 'Source'}
                        </span>
                        {#if tpl.defaultAmount}
                            <span class="opacity-50">·</span>
                            <span class="font-mono">{tpl.defaultAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        {/if}
                        {#if tpl.usageCount > 0}
                            <span class="opacity-50">·</span>
                            <span>used {tpl.usageCount}×</span>
                        {/if}
                    </p>
                    {#if tpl.previousTemplate}
                        <p class="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                            <Link2 class="size-3" aria-hidden="true" />
                            <span>Continuation of <span class="font-medium text-foreground/80">{tpl.previousTemplate.name}</span></span>
                        </p>
                    {/if}
                </div>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        class="p-1.5 rounded-[var(--radius-sm)] hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center"
                        aria-label="More actions"
                    >
                        <MoreVertical class="size-4" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" class="min-w-[14rem]">
                        <DropdownMenu.Item onclick={() => startEdit(tpl)}>
                            <Pencil class="size-3.5" />
                            <span>Edit</span>
                        </DropdownMenu.Item>
                        {#if !tpl.endedAt}
                            <DropdownMenu.Item onclick={() => handleReplace(tpl)}>
                                <Repeat class="size-3.5" />
                                <span>Replace template…</span>
                            </DropdownMenu.Item>
                        {/if}
                        <DropdownMenu.Item onclick={() => openLinkPicker(tpl)}>
                            <Link2 class="size-3.5" />
                            <span>{tpl.previousTemplateId ? 'Change linked previous…' : 'Link to previous template…'}</span>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item destructive onclick={() => handleDelete(tpl)}>
                            <Trash2 class="size-3.5" />
                            <span>Delete</span>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </div>
        {/snippet}

        {#if activeTemplates.length > 0}
            <section>
                <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Active ({activeTemplates.length})
                </h2>
                <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                    {#each activeTemplates as tpl (tpl.id)}
                        {@render row(tpl, false)}
                    {/each}
                </div>
            </section>
        {/if}

        {#if endedTemplates.length > 0}
            <section>
                <button
                    type="button"
                    onclick={() => (showEnded = !showEnded)}
                    class="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
                >
                    {showEnded ? 'Hide' : 'Show'} ended ({endedTemplates.length})
                </button>
                {#if showEnded}
                    <div class="rounded-[var(--radius-md)] border bg-card divide-y divide-border overflow-hidden">
                        {#each endedTemplates as tpl (tpl.id)}
                            {@render row(tpl, true)}
                        {/each}
                    </div>
                {/if}
            </section>
        {/if}
    {/if}
</div>

{#if linkingTemplate}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <button type="button" class="fixed inset-0 bg-black/50" onclick={closeLinkPicker} aria-label="Close"></button>
        <div class="relative z-10 w-full max-w-md rounded-[var(--radius-md)] border bg-card shadow-lg">
            <div class="p-5 space-y-3">
                <h3 class="text-base font-semibold">Link "{linkingTemplate.name}" to a previous template</h3>
                <p class="text-xs text-muted-foreground">
                    Use this when this template is the continuation of an older one — for example, a new salary template after a job change. The two will share a lineage.
                </p>
                <div class="max-h-64 overflow-y-auto rounded-md border divide-y">
                    <button
                        type="button"
                        onclick={() => (linkSelection = null)}
                        class="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/40 {linkSelection === null ? 'bg-muted/40' : ''}"
                    >
                        <span class="size-4 rounded-full border {linkSelection === null ? 'bg-primary border-primary' : 'border-muted-foreground/40'}"></span>
                        <span class="font-medium">None — not a continuation</span>
                    </button>
                    {#each linkCandidates as candidate (candidate.id)}
                        <button
                            type="button"
                            onclick={() => (linkSelection = candidate.id)}
                            class="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted/40 {linkSelection === candidate.id ? 'bg-muted/40' : ''}"
                        >
                            <span class="size-4 rounded-full border {linkSelection === candidate.id ? 'bg-primary border-primary' : 'border-muted-foreground/40'}"></span>
                            <span class="text-base shrink-0" aria-hidden="true">{candidate.icon ?? '💰'}</span>
                            <span class="flex-1 min-w-0">
                                <span class="font-medium block truncate">{candidate.name}</span>
                                <span class="text-[11px] text-muted-foreground">
                                    {candidate.source.name ?? 'Source'}
                                    {#if candidate.endedAt}
                                        · ended
                                    {/if}
                                </span>
                            </span>
                        </button>
                    {:else}
                        <div class="px-3 py-4 text-xs text-muted-foreground text-center">
                            No candidates available.
                        </div>
                    {/each}
                </div>
                <p class="text-[11px] text-muted-foreground">Selected: {previousPickerName()}</p>
            </div>
            <div class="border-t p-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" size="sm" onclick={closeLinkPicker}>Cancel</Button>
                <Button size="sm" onclick={confirmLink}>Save</Button>
            </div>
        </div>
    </div>
{/if}

<Toaster />
