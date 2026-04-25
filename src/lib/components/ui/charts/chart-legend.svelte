<script lang="ts">
    interface LegendItem {
        label: string;
        /** CSS color value (variable, hex, etc.). */
        color: string;
    }

    interface Props {
        items: LegendItem[];
        class?: string;
    }

    let { items, class: className }: Props = $props();
</script>

<ul class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground {className ?? ''}">
    {#each items as item (item.label)}
        <li class="inline-flex items-center gap-1.5">
            <span
                class="inline-block size-2.5 rounded-[2px] shrink-0"
                style="background-color: {item.color};"
            ></span>
            <span class="truncate">{item.label}</span>
        </li>
    {/each}
</ul>
