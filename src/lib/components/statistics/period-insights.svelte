<script lang="ts">
    import { goto } from '$app/navigation';
    import { resource } from 'runed';
    import { ofetch, FetchError } from 'ofetch';
    import { Card, CardContent } from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import Sparkles from '@lucide/svelte/icons/sparkles';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';
    import type { StatisticsInsightsResponse } from '$lib/schemas/statisticsInsights';

    interface Props {
        vaultId: string;
        start: string;
        end: string;
        /** When false, render the upsell variant — no fetch is performed. */
        canUseAi: boolean;
    }

    let { vaultId, start, end, canUseAi }: Props = $props();

    let manualRefreshKey = $state(0);

    type InsightKind = 'plan' | 'rate' | 'access' | 'generic';

    class InsightsError extends Error {
        kind: InsightKind;
        constructor(message: string, kind: InsightKind) {
            super(message);
            this.kind = kind;
        }
    }

    type ApiResp =
        | { success: true; data: StatisticsInsightsResponse }
        | { success: false; error: string; kind?: InsightKind };

    const insightsResource = resource(
        () => (canUseAi ? [vaultId, start, end, manualRefreshKey] as const : null),
        async (deps) => {
            if (!deps) return null;
            const [id, s, e, key] = deps;
            const qs = new URLSearchParams({ vaultId: id, start: s, end: e });
            if (key > 0) qs.set('refresh', 'true');
            try {
                const r = await ofetch<ApiResp>(`/api/getStatisticsInsights?${qs.toString()}`);
                if (!r.success) throw new InsightsError(r.error, r.kind ?? 'generic');
                return r.data;
            } catch (err) {
                if (err instanceof InsightsError) throw err;
                if (err instanceof FetchError) {
                    const data = err.data as { error?: string; kind?: InsightKind } | undefined;
                    throw new InsightsError(data?.error ?? err.message, data?.kind ?? 'generic');
                }
                throw new InsightsError(err instanceof Error ? err.message : 'Insights unavailable', 'generic');
            }
        },
    );

    const data = $derived(insightsResource.current);
    const error = $derived(insightsResource.error as InsightsError | null);
    const loading = $derived(insightsResource.loading);

    function refresh() {
        manualRefreshKey++;
    }

    function toneClass(tone: 'positive' | 'negative' | 'neutral'): string {
        switch (tone) {
            case 'positive':
                return 'border-l-emerald-400/70 dark:border-l-emerald-500/60';
            case 'negative':
                return 'border-l-destructive/70';
            default:
                return 'border-l-muted-foreground/40';
        }
    }
</script>


<Card>
    <CardContent class="pt-6 space-y-3">
        <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
                <Sparkles class="size-4 text-primary" />
                <h2 class="text-sm font-semibold">Period insights</h2>
            </div>
            {#if canUseAi && !loading && data}
                <button
                    type="button"
                    onclick={refresh}
                    class="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    title="Regenerate insights"
                >
                    <RefreshCw class="size-3" />
                    Refresh
                </button>
            {/if}
        </div>

        {#if !canUseAi}
            <!-- Upsell variant -->
            <div class="space-y-3">
                <p class="text-sm text-muted-foreground">
                    Numbers tell you <em>what</em> changed. Pro tells you <em>why</em>.
                </p>
                <ul class="space-y-2 opacity-60 select-none" aria-hidden="true">
                    <li class="border-l-2 border-l-muted-foreground/40 pl-3 py-0.5">
                        <p class="text-sm font-medium blur-[3px]">Dining up 38% this month</p>
                        <p class="text-xs text-muted-foreground blur-[3px]">Driven by 4 weekend dinners over $80…</p>
                    </li>
                    <li class="border-l-2 border-l-emerald-400/70 pl-3 py-0.5">
                        <p class="text-sm font-medium blur-[3px]">Transport down vs last month</p>
                        <p class="text-xs text-muted-foreground blur-[3px]">Fewer rideshare trips after WFH switch…</p>
                    </li>
                </ul>
                <Button size="sm" onclick={() => goto('/settings/plan')}>
                    Upgrade for AI insights
                </Button>
            </div>
        {:else if loading}
            <div class="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <div class="animate-pulse size-2 rounded-full bg-primary"></div>
                Reading your spending…
            </div>
        {:else if error}
            <p class="text-xs text-muted-foreground">
                {#if error.kind === 'rate'}
                    {error.message}
                {:else}
                    Insights unavailable right now.
                {/if}
            </p>
        {:else if data}
            <p class="text-sm font-medium leading-snug">{data.headline}</p>
            <ul class="space-y-1.5">
                {#each data.bullets as b, i (i)}
                    <li class="border-l-2 {toneClass(b.tone)} pl-3 py-0.5">
                        <p class="text-sm font-medium leading-snug">{b.title}</p>
                        <p class="text-xs text-muted-foreground leading-snug mt-0.5">{b.detail}</p>
                    </li>
                {/each}
            </ul>
            <p class="text-[10px] text-muted-foreground">
                Generated by AI · {data.cached ? 'cached' : 'just now'}
            </p>
        {/if}
    </CardContent>
</Card>
