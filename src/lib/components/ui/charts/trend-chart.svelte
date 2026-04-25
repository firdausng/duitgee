<script lang="ts">
    import { AreaChart } from 'layerchart';
    import * as Chart from '$lib/components/ui/chart';
    import type { ChartConfig } from '$lib/components/ui/chart';
    import ChartLegend from './chart-legend.svelte';

    type Point = { date: Date; current: number; previous: number | null };

    interface Props {
        /** Sorted ascending by date. */
        data: Point[];
        currentLabel?: string;
        previousLabel?: string;
        showPrevious?: boolean;
    }

    let {
        data,
        currentLabel = 'This period',
        previousLabel = 'Previous period',
        showPrevious = false,
    }: Props = $props();

    const config = $derived<ChartConfig>({
        current: { label: currentLabel, color: 'var(--chart-1)' },
        previous: { label: previousLabel, color: 'var(--chart-2)' },
    });

    const series = $derived(
        showPrevious
            ? [
                  { key: 'previous' as const, label: previousLabel, value: 'previous', color: 'var(--color-previous)' },
                  { key: 'current' as const, label: currentLabel, value: 'current', color: 'var(--color-current)' },
              ]
            : [
                  { key: 'current' as const, label: currentLabel, value: 'current', color: 'var(--color-current)' },
              ],
    );

    const legendItems = $derived(
        showPrevious
            ? [
                  { label: currentLabel, color: 'var(--chart-1)' },
                  { label: previousLabel, color: 'var(--chart-2)' },
              ]
            : [{ label: currentLabel, color: 'var(--chart-1)' }],
    );
</script>

<div class="flex flex-col gap-3">
    <Chart.Container {config} class="aspect-[16/7]">
        <AreaChart
            {data}
            x="date"
            {series}
            seriesLayout="overlap"
            legend={false}
        />
    </Chart.Container>
    {#if showPrevious}
        <ChartLegend items={legendItems} />
    {/if}
</div>
