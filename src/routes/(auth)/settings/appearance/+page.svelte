<script lang="ts">
    import { mode, setMode } from 'mode-watcher';
    import { cn } from '$lib/utils';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    import Sun from '@lucide/svelte/icons/sun';
    import Moon from '@lucide/svelte/icons/moon';
    import Monitor from '@lucide/svelte/icons/monitor';
    import type { Component } from 'svelte';

    type ModeValue = 'light' | 'dark' | 'system';
    type Choice = { value: ModeValue; label: string; icon: Component };
    const choices: Choice[] = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
    ];

    function pick(value: ModeValue) {
        setMode(value);
    }
</script>

<div class="space-y-6">
    <Card>
        <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Choose how DuitGee looks. System matches your OS preference.</CardDescription>
        </CardHeader>
        <CardContent>
            <div class="grid grid-cols-3 gap-3">
                {#each choices as choice (choice.value)}
                    {@const Icon = choice.icon}
                    {@const active = mode.current === choice.value}
                    <button
                        type="button"
                        onclick={() => pick(choice.value)}
                        aria-pressed={active}
                        class={cn(
                            'flex flex-col items-center gap-2 rounded-md border p-4 text-sm transition-colors',
                            active
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                                : 'border-border hover:border-primary/40 hover:bg-accent/50',
                        )}
                    >
                        <Icon class="size-5 text-muted-foreground" />
                        <span class={active ? 'font-medium' : ''}>{choice.label}</span>
                    </button>
                {/each}
            </div>
        </CardContent>
    </Card>

    <Card>
        <CardHeader>
            <CardTitle>Density</CardTitle>
            <CardDescription>Compact mode reduces padding and type scale across lists. Coming soon.</CardDescription>
        </CardHeader>
        <CardContent>
            <p class="text-sm text-muted-foreground">
                Density toggle ships in a follow-up update — track progress in <code>nav-redesign.md</code>.
            </p>
        </CardContent>
    </Card>
</div>
