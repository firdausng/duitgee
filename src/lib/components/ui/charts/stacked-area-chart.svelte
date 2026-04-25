<script lang="ts">
    import { AreaChart } from 'layerchart';
    import * as Chart from '$lib/components/ui/chart';
    import type { ChartConfig } from '$lib/components/ui/chart';
    import ChartLegend from './chart-legend.svelte';

    interface Props {
        /** Each row is one bucket plus a numeric value per series key. */
        data: Array<Record<string, number | Date> & { date: Date }>;
        /** Series keys, in stack order (bottom to top). */
        seriesKeys: string[];
        /** Map from series key → human-readable label. */
        labels: Record<string, string>;
        /** Map from series key → CSS color (variable or hex). */
        colors?: Record<string, string>;
    }

    let { data, seriesKeys, labels, colors = {} }: Props = $props();

    function colorFor(key: string, i: number): string {
        return colors[key] ?? `var(--chart-${(i % 5) + 1})`;
    }

    const config = $derived<ChartConfig>(
        Object.fromEntries(
            seriesKeys.map((key, i) => [
                key,
                { label: labels[key] ?? key, color: colorFor(key, i) },
            ]),
        ),
    );

    const series = $derived(
        seriesKeys.map((key) => ({
            key,
            label: labels[key] ?? key,
            value: key,
            color: `var(--color-${key})`,
        })),
    );

    const legendItems = $derived(
        seriesKeys.map((key, i) => ({
            label: labels[key] ?? key,
            color: colorFor(key, i),
        })),
    );
</script>

<div class="flex flex-col gap-3">
    <Chart.Container {config} class="aspect-[16/7]">
        <AreaChart
            {data}
            x="date"
            {series}
            seriesLayout="stack"
            legend={false}
        />
    </Chart.Container>
    <ChartLegend items={legendItems} />
</div>
