<script lang="ts">
    import { AreaChart } from 'layerchart';
    import * as Chart from '$lib/components/ui/chart';
    import type { ChartConfig } from '$lib/components/ui/chart';

    interface Props {
        data: Array<{ date: Date; value: number }>;
        color?: string;
    }

    let { data, color = 'var(--chart-1)' }: Props = $props();

    const config: ChartConfig = {
        value: {
            label: 'Value',
            color,
        },
    };
</script>

<Chart.Container {config} class="h-12 w-full aspect-auto">
    <AreaChart
        {data}
        x="date"
        y="value"
        axis={false}
        grid={false}
        rule={false}
        legend={false}
        highlight={{ lines: false, points: false }}
    />
</Chart.Container>
