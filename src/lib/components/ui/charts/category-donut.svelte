<script lang="ts">
    import { PieChart } from 'layerchart';
    import * as Chart from '$lib/components/ui/chart';
    import type { ChartConfig } from '$lib/components/ui/chart';
    import ChartLegend from './chart-legend.svelte';

    interface Slice {
        label: string;
        value: number;
        color?: string | null;
    }

    interface Props {
        data: Slice[];
        /** Override max slices; remainder collapsed into "Other". */
        topN?: number;
        /** Show the custom HTML legend below the chart. */
        showLegend?: boolean;
    }

    let { data, topN = 6, showLegend = true }: Props = $props();

    const visible = $derived.by(() => {
        if (data.length <= topN) return data;
        const top = data.slice(0, topN);
        const rest = data.slice(topN);
        const otherTotal = rest.reduce((s, r) => s + r.value, 0);
        return [...top, { label: 'Other', value: otherTotal, color: 'var(--muted-foreground)' }];
    });

    function colorFor(slice: Slice, i: number): string {
        return slice.color ?? `var(--chart-${(i % 5) + 1})`;
    }

    const config = $derived<ChartConfig>(
        Object.fromEntries(
            visible.map((s, i) => [
                s.label,
                { label: s.label, color: colorFor(s, i) },
            ]),
        ),
    );

    const legendItems = $derived(
        visible.map((s, i) => ({ label: s.label, color: colorFor(s, i) })),
    );
</script>

<div class="flex flex-col gap-3 items-center">
    <Chart.Container {config} class="aspect-square max-h-[260px] w-full">
        <PieChart
            data={visible}
            key="label"
            value="value"
            innerRadius={60}
            cornerRadius={4}
            padAngle={0.02}
            legend={false}
        />
    </Chart.Container>
    {#if showLegend}
        <ChartLegend items={legendItems} class="justify-center" />
    {/if}
</div>
