<script lang="ts" module>
    export type FirstVaultWizardProps = {
        creatorId: string;
        onCancel?: () => void;
    };

    const PRESETS = [
        { id: 'personal', label: 'Personal expenses', icon: '👛', color: '#3B82F6' },
        { id: 'family', label: 'Family budget', icon: '🏠', color: '#10B981' },
        { id: 'project', label: 'Side project', icon: '💼', color: '#8B5CF6' },
        { id: 'travel', label: 'Travel', icon: '✈️', color: '#F59E0B' },
    ];

    const COLORS = [
        '#3B82F6', // blue
        '#10B981', // green
        '#F59E0B', // amber
        '#EF4444', // red
        '#8B5CF6', // purple
        '#EC4899', // pink
        '#06B6D4', // cyan
        '#6366F1', // indigo
    ];

    const ICONS = [
        '👛', '🏦', '🏠', '💼', '🎒', '✈️',
        '🍽️', '🛒', '🚗', '🎮', '📚', '🐱',
    ];
</script>

<script lang="ts">
    import { goto } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { toast } from 'svelte-sonner';
    import { cn } from '$lib/utils';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import Check from '@lucide/svelte/icons/check';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';

    let { creatorId, onCancel }: FirstVaultWizardProps = $props();

    let step = $state<1 | 2 | 3>(1);
    let name = $state('');
    let icon = $state('👛');
    let color = $state('#3B82F6');
    let createFund = $state(false);
    let fundName = $state('Main');
    let submitting = $state(false);

    function pickPreset(preset: typeof PRESETS[number]) {
        name = preset.label;
        icon = preset.icon;
        color = preset.color;
    }

    function next() {
        if (step === 1 && !name.trim()) {
            toast.error('Give your vault a name to continue');
            return;
        }
        step = (step + 1) as typeof step;
    }
    function back() {
        if (step > 1) step = (step - 1) as typeof step;
    }

    async function finish() {
        if (!name.trim()) {
            toast.error('Give your vault a name to continue');
            step = 1;
            return;
        }

        submitting = true;
        try {
            const vaultRes = await ofetch<{
                success: boolean;
                data: { vault: { id: string } };
                error?: string;
            }>('/api/createVault', {
                method: 'POST',
                body: {
                    name: name.trim(),
                    icon,
                    color,
                    creatorId,
                    createdBy: creatorId,
                },
            });

            if (!vaultRes.success) {
                throw new Error(vaultRes.error || 'Failed to create vault');
            }

            const vaultId = vaultRes.data.vault.id;

            if (createFund && fundName.trim()) {
                try {
                    await ofetch('/api/createFund', {
                        method: 'POST',
                        body: {
                            vaultId,
                            name: fundName.trim(),
                            color,
                            replenishmentType: 'manual',
                        },
                    });
                } catch (err) {
                    // Fund creation failed but vault succeeded — user can create the fund later.
                    console.error('Failed to create initial fund:', err);
                    toast.warning(
                        "Vault created, but couldn't create the fund. You can add it later from the Funds tab.",
                    );
                }
            }

            toast.success('Vault created');
            await goto(`/vaults/${vaultId}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create vault';
            toast.error(message);
            submitting = false;
        }
    }
</script>

<div class="max-w-xl mx-auto">
    <!-- Step indicator -->
    <div class="flex items-center justify-center gap-2 mb-6" aria-label="Step {step} of 3">
        {#each [1, 2, 3] as s (s)}
            {@const done = s < step}
            {@const active = s === step}
            <div
                class={cn(
                    'h-1.5 rounded-full transition-all',
                    active ? 'w-8 bg-primary' : done ? 'w-6 bg-primary/60' : 'w-6 bg-muted',
                )}
                aria-current={active ? 'step' : undefined}
            ></div>
        {/each}
    </div>

    <div class="rounded-[var(--radius-md)] border bg-card p-6 sm:p-8">
        {#if step === 1}
            <h2 class="text-xl font-semibold mb-1">What's this vault for?</h2>
            <p class="text-sm text-muted-foreground mb-5">
                Pick a starting point or write your own. You can rename it any time.
            </p>

            <div class="grid grid-cols-2 gap-2 mb-4">
                {#each PRESETS as preset (preset.id)}
                    <button
                        type="button"
                        onclick={() => pickPreset(preset)}
                        class={cn(
                            'flex items-center gap-3 p-3 rounded-md border text-left transition-colors',
                            name === preset.label
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                : 'border-border hover:border-primary/40 hover:bg-accent/50',
                        )}
                    >
                        <span
                            class="inline-flex items-center justify-center size-9 rounded-md text-lg shrink-0"
                            style="background-color: {preset.color}26;"
                        >
                            {preset.icon}
                        </span>
                        <span class="text-sm font-medium truncate">{preset.label}</span>
                    </button>
                {/each}
            </div>

            <div class="space-y-2">
                <Label for="vault-name">Or name it yourself</Label>
                <Input
                    id="vault-name"
                    placeholder="e.g. Studio costs"
                    bind:value={name}
                    disabled={submitting}
                    autofocus
                />
            </div>
        {:else if step === 2}
            <h2 class="text-xl font-semibold mb-1">Pick an icon and color</h2>
            <p class="text-sm text-muted-foreground mb-5">
                Helps you spot your vault at a glance, especially when you have several.
            </p>

            <div class="space-y-5">
                <div>
                    <p class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Color</p>
                    <div class="flex flex-wrap gap-2">
                        {#each COLORS as c (c)}
                            <button
                                type="button"
                                onclick={() => (color = c)}
                                aria-label={`Color ${c}`}
                                aria-pressed={color === c}
                                class={cn(
                                    'size-9 rounded-md border-2 transition-all',
                                    color === c ? 'ring-2 ring-ring ring-offset-2 scale-105' : 'border-transparent',
                                )}
                                style="background-color: {c};"
                            ></button>
                        {/each}
                    </div>
                </div>

                <div>
                    <p class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Icon</p>
                    <div class="grid grid-cols-6 gap-2">
                        {#each ICONS as i (i)}
                            <button
                                type="button"
                                onclick={() => (icon = i)}
                                aria-label={`Icon ${i}`}
                                aria-pressed={icon === i}
                                class={cn(
                                    'size-12 rounded-md text-2xl flex items-center justify-center border transition-colors',
                                    icon === i
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                        : 'border-border hover:bg-accent/50',
                                )}
                            >
                                {i}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Preview -->
                <div class="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                    <span
                        class="inline-flex items-center justify-center size-10 rounded-md text-xl shrink-0"
                        style="background-color: {color}26;"
                    >
                        {icon}
                    </span>
                    <div class="min-w-0">
                        <p class="text-sm font-semibold truncate">{name || 'Your vault'}</p>
                        <p class="text-xs text-muted-foreground">Preview</p>
                    </div>
                </div>
            </div>
        {:else}
            <h2 class="text-xl font-semibold mb-1">How will you track money?</h2>
            <p class="text-sm text-muted-foreground mb-5">
                A fund is a budget pool you spend out of (e.g. "Groceries", "Petrol"). You can add more later.
            </p>

            <div class="space-y-3">
                <button
                    type="button"
                    onclick={() => (createFund = false)}
                    aria-pressed={!createFund}
                    class={cn(
                        'w-full flex items-start gap-3 p-3 rounded-md border text-left transition-colors',
                        !createFund
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border hover:border-primary/40 hover:bg-accent/50',
                    )}
                >
                    <span
                        class={cn(
                            'inline-flex items-center justify-center size-5 rounded-full mt-0.5 shrink-0',
                            !createFund ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground/40',
                        )}
                    >
                        {#if !createFund}<Check class="size-3" />{/if}
                    </span>
                    <div class="min-w-0">
                        <p class="text-sm font-medium">Just track expenses</p>
                        <p class="text-xs text-muted-foreground mt-0.5">Start simple. Add funds whenever you want.</p>
                    </div>
                </button>

                <button
                    type="button"
                    onclick={() => (createFund = true)}
                    aria-pressed={createFund}
                    class={cn(
                        'w-full flex items-start gap-3 p-3 rounded-md border text-left transition-colors',
                        createFund
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border hover:border-primary/40 hover:bg-accent/50',
                    )}
                >
                    <span
                        class={cn(
                            'inline-flex items-center justify-center size-5 rounded-full mt-0.5 shrink-0',
                            createFund ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground/40',
                        )}
                    >
                        {#if createFund}<Check class="size-3" />{/if}
                    </span>
                    <div class="min-w-0">
                        <p class="text-sm font-medium">Track expenses and budget by fund</p>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            We'll create a starting fund for you.
                        </p>
                    </div>
                </button>

                {#if createFund}
                    <div class="pl-8 space-y-2">
                        <Label for="fund-name">Fund name</Label>
                        <Input
                            id="fund-name"
                            placeholder="Main"
                            bind:value={fundName}
                            disabled={submitting}
                        />
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Navigation -->
        <div class="mt-6 flex items-center justify-between gap-3">
            {#if step === 1}
                <Button variant="ghost" type="button" onclick={onCancel} disabled={submitting}>
                    Skip for now
                </Button>
            {:else}
                <Button variant="ghost" type="button" onclick={back} disabled={submitting}>
                    <ChevronLeft class="size-4" />
                    Back
                </Button>
            {/if}

            {#if step < 3}
                <Button type="button" onclick={next} disabled={submitting}>
                    Continue
                    <ChevronRight class="size-4" />
                </Button>
            {:else}
                <Button type="button" onclick={finish} disabled={submitting}>
                    {submitting ? 'Creating…' : 'Create vault'}
                </Button>
            {/if}
        </div>
    </div>
</div>
