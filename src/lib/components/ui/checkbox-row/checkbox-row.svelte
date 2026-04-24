<script lang="ts" module>
    import type { Snippet } from 'svelte';
    import type { CheckboxSize } from '$lib/components/ui/checkbox';

    export interface CheckboxRowProps {
        /** Two-way bindable checked state. */
        checked?: boolean;
        /** Two-way bindable indeterminate state. */
        indeterminate?: boolean;
        /** Emitted with the *new* checked value after each toggle. */
        onCheckedChange?: (checked: boolean) => void;
        /** Size of the inner checkbox. Defaults to 'sm'. */
        size?: CheckboxSize;
        /** Disabled state — dims the row and blocks interaction. */
        disabled?: boolean;
        /** Optional form name for the hidden input bits-ui wires up. */
        name?: string;
        /** Optional id for the label association. Auto-generated if omitted. */
        id?: string;
        /** Extra classes on the row container. */
        class?: string;
        /** Row header text. */
        label: Snippet;
        /** Optional secondary line rendered below the label. */
        description?: Snippet;
        /** Right-aligned slot (e.g. an inline hint). */
        adornment?: Snippet;
    }
</script>

<script lang="ts">
    import { Checkbox } from '$lib/components/ui/checkbox';
    import { cn } from '$lib/utils';

    let {
        checked = $bindable(false),
        indeterminate = $bindable(false),
        onCheckedChange,
        size = 'sm',
        disabled = false,
        name,
        id,
        class: className,
        label,
        description,
        adornment,
    }: CheckboxRowProps = $props();

    const rowId = $derived(id ?? `checkbox-row-${Math.random().toString(36).slice(2, 9)}`);

    function handleChange(next: boolean) {
        checked = next;
        onCheckedChange?.(next);
    }
</script>

<label
    for={rowId}
    class={cn(
        'flex items-start gap-3 cursor-pointer select-none',
        disabled && 'cursor-not-allowed opacity-60',
        className,
    )}
>
    <Checkbox
        id={rowId}
        {name}
        {size}
        {disabled}
        {checked}
        {indeterminate}
        onCheckedChange={handleChange}
        class="mt-0.5 shrink-0"
    />
    <div class="min-w-0 flex-1">
        <p class="text-sm font-medium leading-tight">{@render label()}</p>
        {#if description}
            <p class="text-xs text-muted-foreground mt-0.5 leading-snug">
                {@render description()}
            </p>
        {/if}
    </div>
    {#if adornment}
        <div class="shrink-0 mt-0.5">
            {@render adornment()}
        </div>
    {/if}
</label>
