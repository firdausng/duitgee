<script lang="ts">
    import { page } from '$app/state';
    import { useSearchParams } from 'runed/kit';
    import { resource } from 'runed';
    import { ofetch } from 'ofetch';
    import * as v from 'valibot';
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { DateRangeFilter } from '$lib/components/ui/date-range-filter';
    import { TrendChart, StackedAreaChart, CategoryDonut, Sparkline } from '$lib/components/ui/charts';
    import { Amount } from '$lib/components/ui/amount';
    import {
        getDateRange,
        localDatetimeToUtcIso,
        type DateFilter,
    } from '$lib/utils';
    import { createVaultFormatters } from '$lib/vaultFormatting';
    import { getPaymentTypeLabel } from '$lib/configurations/paymentTypes';
    import type { VaultWithMember } from '$lib/schemas/read/vaultWithMember';
    import type {
        SpendTrendResponse,
        CategoryTrendResponse,
        CategoryBreakdownItem,
        MemberBreakdownItem,
        PaymentTypeBreakdownItem,
        FundSpendTrendResponse,
        TemplateBreakdownItem,
    } from '$lib/schemas/statistics';
    import TrendingUp from '@lucide/svelte/icons/trending-up';
    import TrendingDown from '@lucide/svelte/icons/trending-down';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import Sparkles from '@lucide/svelte/icons/sparkles';

    const { vaultId } = page.params;

    const paramsSchema = v.object({
        filter: v.optional(
            v.picklist(['today', 'yesterday', 'week', 'month', 'year', 'last7', 'last30', 'last90', 'custom']),
            'month',
        ),
        startDate: v.optional(v.fallback(v.string(), ''), ''),
        endDate: v.optional(v.fallback(v.string(), ''), ''),
        compare: v.optional(v.fallback(v.string(), 'true'), 'true'),
    });

    const params = useSearchParams(paramsSchema);
    const filterType = $derived((params.filter ?? 'month') as DateFilter);
    const showCompare = $derived(params.compare !== 'false');

    function dateRangeFromFilter(): { start: string; end: string } {
        if (filterType === 'custom' && params.startDate && params.endDate) {
            return {
                start: localDatetimeToUtcIso(params.startDate),
                end: localDatetimeToUtcIso(params.endDate),
            };
        }
        const r = getDateRange(filterType);
        // Sensible default if something went sideways.
        if (!r.startDate || !r.endDate) {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);
            return { start: start.toISOString(), end: end.toISOString() };
        }
        return { start: r.startDate, end: r.endDate };
    }

    const range = $derived(dateRangeFromFilter());

    const vaultResource = resource(
        () => [vaultId] as const,
        async ([id]) => {
            const r = await ofetch<{ success: boolean; data: VaultWithMember }>(`/api/getVault?vaultId=${id}`);
            return r.data;
        },
    );
    const vault = $derived(vaultResource.current?.vaults);
    const fmt = $derived(
        createVaultFormatters({
            locale: vault?.locale || 'en-US',
            currency: vault?.currency || 'USD',
        }),
    );

    type Resp<T> = { success: boolean; data: T };

    type DashboardPayload = {
        spendTrend: SpendTrendResponse;
        categoryTrend: CategoryTrendResponse;
        categoryBreakdown: CategoryBreakdownItem[];
        memberBreakdown: MemberBreakdownItem[];
        paymentTypeBreakdown: PaymentTypeBreakdownItem[];
        fundSpendTrend: FundSpendTrendResponse;
        templateBreakdown: TemplateBreakdownItem[];
    };

    // One round-trip — composite handler runs all sections in parallel server-side.
    const dashboardResource = resource(
        () => [vaultId, range.start, range.end, showCompare] as const,
        async () => {
            const qs = new URLSearchParams({
                vaultId: vaultId ?? '',
                start: range.start,
                end: range.end,
                compare: showCompare ? 'prev' : 'none',
                includeNetPosition: 'true',
                topN: '5',
            });
            const r = await ofetch<Resp<DashboardPayload>>(
                `/api/getStatisticsDashboard?${qs.toString()}`,
            );
            return r.data;
        },
    );

    // Individual aliases — keep the rest of the template unchanged.
    const trendResource = $derived({
        loading: dashboardResource.loading,
        current: dashboardResource.current?.spendTrend,
    });
    const categoryTrendResource = $derived({
        loading: dashboardResource.loading,
        current: dashboardResource.current?.categoryTrend,
    });
    const categoryBreakdownResource = $derived({
        loading: dashboardResource.loading,
        current: dashboardResource.current?.categoryBreakdown,
    });
    const memberBreakdownResource = $derived({
        loading: dashboardResource.loading,
        current: dashboardResource.current?.memberBreakdown,
    });
    const paymentTypeResource = $derived({
        loading: dashboardResource.loading,
        current: dashboardResource.current?.paymentTypeBreakdown,
    });
    const fundSpendResource = $derived({
        loading: dashboardResource.loading,
        current: dashboardResource.current?.fundSpendTrend,
    });
    const templateBreakdownResource = $derived({
        loading: dashboardResource.loading,
        current: dashboardResource.current?.templateBreakdown,
    });

    const templateDonutData = $derived(
        (templateBreakdownResource.current ?? []).map((t) => ({
            label: t.templateName,
            value: t.totalAmount,
            color: null,
        })),
    );

    // Hero numbers
    const currentTotal = $derived(
        trendResource.current?.current.reduce((s, b) => s + b.total, 0) ?? 0,
    );
    const previousTotal = $derived(
        trendResource.current?.previous?.reduce((s, b) => s + b.total, 0) ?? null,
    );
    const deltaPct = $derived.by(() => {
        if (previousTotal === null || previousTotal === 0) return null;
        return ((currentTotal - previousTotal) / previousTotal) * 100;
    });

    function formatBucketLabel(bucket: string): Date {
        // bucket: "YYYY-MM-DD" | "YYYY-Www" | "YYYY-MM"
        if (/^\d{4}-\d{2}-\d{2}$/.test(bucket)) return new Date(bucket + 'T00:00:00Z');
        if (/^\d{4}-W\d{2}$/.test(bucket)) {
            const [y, w] = bucket.split('-W');
            const d = new Date(Date.UTC(Number(y), 0, 1));
            d.setUTCDate(d.getUTCDate() + Number(w) * 7);
            return d;
        }
        if (/^\d{4}-\d{2}$/.test(bucket)) return new Date(bucket + '-01T00:00:00Z');
        return new Date(bucket);
    }

    // Trend chart input
    const trendData = $derived.by(() => {
        const cur = trendResource.current?.current ?? [];
        const prev = trendResource.current?.previous ?? null;
        return cur.map((b, i) => ({
            date: formatBucketLabel(b.bucket),
            current: b.total,
            previous: prev?.[i]?.total ?? null,
        }));
    });

    // Stacked area chart input — one row per bucket, columns per series
    const stackedData = $derived.by(() => {
        const series = categoryTrendResource.current?.series ?? [];
        const other = categoryTrendResource.current?.other ?? [];
        const allBuckets = new Set<string>();
        for (const s of series) for (const b of s.buckets) allBuckets.add(b.bucket);
        for (const b of other) allBuckets.add(b.bucket);

        const sortedBuckets = Array.from(allBuckets).sort();
        return sortedBuckets.map((bucket) => {
            const row: Record<string, number | Date> & { date: Date } = {
                date: formatBucketLabel(bucket),
            };
            for (const s of series) {
                row[s.categoryName] = s.buckets.find((b) => b.bucket === bucket)?.total ?? 0;
            }
            if (other.length > 0) {
                row.Other = other.find((b) => b.bucket === bucket)?.total ?? 0;
            }
            return row;
        });
    });

    const seriesKeys = $derived.by(() => {
        const keys = (categoryTrendResource.current?.series ?? []).map((s) => s.categoryName);
        if ((categoryTrendResource.current?.other.length ?? 0) > 0) keys.push('Other');
        return keys;
    });

    const seriesLabels = $derived.by(() => {
        const labels: Record<string, string> = {};
        for (const s of categoryTrendResource.current?.series ?? []) labels[s.categoryName] = s.categoryName;
        labels.Other = 'Other';
        return labels;
    });

    const seriesColors = $derived.by(() => {
        const colors: Record<string, string> = {};
        for (const s of categoryTrendResource.current?.series ?? []) {
            if (s.categoryColor) colors[s.categoryName] = s.categoryColor;
        }
        return colors;
    });

    // Donut input
    const categoryDonutData = $derived(
        (categoryBreakdownResource.current ?? []).map((c) => ({
            label: c.categoryName,
            value: c.totalAmount,
            color: c.categoryColor,
        })),
    );

    const paymentTypeDonutData = $derived(
        (paymentTypeResource.current ?? []).map((p) => ({
            label: getPaymentTypeLabel(p.paymentType),
            value: p.totalAmount,
            color: null,
        })),
    );

    const fundSparklines = $derived(
        (fundSpendResource.current?.funds ?? []).map((f) => ({
            ...f,
            sparkData: f.buckets.map((b) => ({
                date: formatBucketLabel(b.bucket),
                value: b.total,
            })),
        })),
    );

    function handleDateRangeChange(next: { filter: DateFilter; startDate?: string; endDate?: string }) {
        // The schema picklist excludes 'all' on this page (statistics needs a window).
        // Fall back to 'month' if upstream emits 'all'.
        const safe = next.filter === 'all' ? 'month' : next.filter;
        params.filter = safe;
        params.startDate = next.startDate ?? '';
        params.endDate = next.endDate ?? '';
    }

    function toggleCompare() {
        params.compare = showCompare ? 'false' : 'true';
    }

    const trendTruncated = $derived(trendResource.current?.truncated ?? false);

    function gotoExpensesFor(filter: { categoryName?: string; paidBy?: string | null }) {
        const qs = new URLSearchParams();
        const r = getDateRange(filterType);
        if (r.startDate) qs.set('startDate', r.startDate);
        if (r.endDate) qs.set('endDate', r.endDate);
        if (filter.categoryName) qs.set('category', filter.categoryName);
        goto(`/vaults/${vaultId}/expenses?${qs.toString()}`);
    }
</script>

<svelte:head>
    <title>Statistics - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-4 md:py-8 px-4 space-y-6">
    <!-- Header strip -->
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
            <p class="text-xs text-muted-foreground uppercase tracking-wide">{vault?.name ?? ''}</p>
            <h1 class="text-2xl md:text-3xl font-bold">Statistics</h1>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <DateRangeFilter
                value={filterType}
                startDate={params.startDate}
                endDate={params.endDate}
                onChange={handleDateRangeChange}
            />
            <Button
                type="button"
                variant={showCompare ? 'default' : 'outline'}
                size="sm"
                onclick={toggleCompare}
                aria-pressed={showCompare}
            >
                Compare
            </Button>
        </div>
    </div>

    <!-- Spend Hero -->
    <Card>
        <CardContent class="pt-6">
            <div class="flex flex-col gap-1">
                <p class="text-xs text-muted-foreground uppercase tracking-wide">Total spend</p>
                <div class="flex items-baseline gap-3">
                    <Amount
                        value={currentTotal}
                        sign="neutral"
                        size="hero"
                        locale={vault?.locale || 'en-US'}
                        currency={vault?.currency || 'USD'}
                    />
                    {#if deltaPct !== null}
                        <span
                            class="inline-flex items-center gap-1 text-sm font-mono {deltaPct > 0 ? 'text-destructive' : 'text-emerald-600'}"
                        >
                            {#if deltaPct > 0}
                                <TrendingUp class="size-3.5" />
                            {:else}
                                <TrendingDown class="size-3.5" />
                            {/if}
                            {Math.abs(deltaPct).toFixed(1)}%
                            <span class="text-muted-foreground font-normal">vs prev</span>
                        </span>
                    {/if}
                </div>
                {#if previousTotal !== null}
                    <p class="text-xs text-muted-foreground">
                        Previous period: <span class="font-mono">{fmt.currency(previousTotal)}</span>
                    </p>
                {/if}
            </div>
        </CardContent>
    </Card>

    <!-- Trend Over Time -->
    <Card>
        <CardHeader>
            <CardTitle class="text-base">Trend</CardTitle>
        </CardHeader>
        <CardContent>
            {#if trendResource.loading}
                <div class="aspect-[16/7] flex items-center justify-center">
                    <div class="animate-spin rounded-full size-6 border-b-2 border-primary"></div>
                </div>
            {:else if trendData.length === 0}
                <p class="text-sm text-muted-foreground py-12 text-center">No expenses in this range.</p>
            {:else}
                <TrendChart data={trendData} showPrevious={showCompare && previousTotal !== null} />
            {/if}
            {#if trendTruncated}
                <p class="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Sparkles class="size-3" />
                    Showing the last 12 months. <a href="/settings/plan" class="underline">Upgrade for unlimited history.</a>
                </p>
            {/if}
        </CardContent>
    </Card>

    <!-- Two-column: Category Trend + Category Breakdown -->
    <div class="grid md:grid-cols-2 gap-4">
        <Card>
            <CardHeader>
                <CardTitle class="text-base">Category trend</CardTitle>
            </CardHeader>
            <CardContent>
                {#if categoryTrendResource.loading}
                    <div class="aspect-[16/7] flex items-center justify-center">
                        <div class="animate-spin rounded-full size-6 border-b-2 border-primary"></div>
                    </div>
                {:else if seriesKeys.length === 0}
                    <p class="text-sm text-muted-foreground py-12 text-center">No category data.</p>
                {:else}
                    <StackedAreaChart
                        data={stackedData}
                        seriesKeys={seriesKeys}
                        labels={seriesLabels}
                        colors={seriesColors}
                    />
                {/if}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle class="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
                {#if categoryBreakdownResource.loading}
                    <div class="aspect-square flex items-center justify-center">
                        <div class="animate-spin rounded-full size-6 border-b-2 border-primary"></div>
                    </div>
                {:else if categoryDonutData.length === 0}
                    <p class="text-sm text-muted-foreground py-12 text-center">No categories yet.</p>
                {:else}
                    <CategoryDonut data={categoryDonutData} topN={6} showLegend={false} />
                    <ul class="space-y-1.5">
                        {#each categoryDonutData.slice(0, 6) as cat (cat.label)}
                            <li>
                                <button
                                    type="button"
                                    onclick={() => gotoExpensesFor({ categoryName: cat.label })}
                                    class="w-full flex items-center justify-between text-sm hover:bg-accent rounded px-2 py-1 -mx-2"
                                >
                                    <span class="flex items-center gap-2">
                                        <span
                                            class="inline-block size-2.5 rounded-sm"
                                            style="background-color: {cat.color ?? 'var(--muted-foreground)'};"
                                        ></span>
                                        <span>{cat.label}</span>
                                    </span>
                                    <span class="font-mono">{fmt.currency(cat.value)}</span>
                                </button>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </CardContent>
        </Card>
    </div>

    <!-- Member breakdown -->
    <Card>
        <CardHeader>
            <CardTitle class="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent>
            {#if memberBreakdownResource.loading}
                <div class="py-8 flex items-center justify-center">
                    <div class="animate-spin rounded-full size-6 border-b-2 border-primary"></div>
                </div>
            {:else if (memberBreakdownResource.current ?? []).length === 0}
                <p class="text-sm text-muted-foreground py-8 text-center">No expenses in this range.</p>
            {:else}
                <ul class="divide-y">
                    {#each memberBreakdownResource.current ?? [] as m (m.userId ?? '__vault__')}
                        <li class="py-2.5 flex items-center justify-between gap-3">
                            <div class="flex flex-col">
                                <span class="text-sm font-medium">{m.displayName}</span>
                                <span class="text-xs text-muted-foreground">{m.count} {m.count === 1 ? 'expense' : 'expenses'}</span>
                            </div>
                            <div class="text-right">
                                <div class="font-mono text-sm">{fmt.currency(m.totalAmount)}</div>
                                {#if m.net !== undefined && m.userId}
                                    <div class="text-xs font-mono {m.net > 0 ? 'text-emerald-600' : 'text-destructive'}">
                                        {m.net > 0 ? '+' : ''}{fmt.currency(m.net)} net
                                    </div>
                                {/if}
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </CardContent>
    </Card>

    <!-- Templates breakdown -->
    <Card>
        <CardHeader>
            <CardTitle class="text-base">Templates</CardTitle>
        </CardHeader>
        <CardContent>
            {#if templateBreakdownResource.loading}
                <div class="py-8 flex items-center justify-center">
                    <div class="animate-spin rounded-full size-6 border-b-2 border-primary"></div>
                </div>
            {:else if (templateBreakdownResource.current ?? []).length === 0}
                <p class="text-sm text-muted-foreground py-8 text-center">No template usage in this range.</p>
            {:else}
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <CategoryDonut data={templateDonutData} topN={6} showLegend={false} />
                    </div>
                    <ul class="space-y-1.5">
                        {#each templateBreakdownResource.current ?? [] as t (t.templateId ?? '__none__')}
                            <li class="flex items-center justify-between text-sm py-1">
                                <span class="flex items-center gap-2 min-w-0">
                                    <span class="text-base shrink-0" aria-hidden="true">
                                        {t.templateIcon ?? '📝'}
                                    </span>
                                    <span class="truncate">{t.templateName}</span>
                                    <span class="text-xs text-muted-foreground shrink-0">· {t.count}</span>
                                </span>
                                <span class="font-mono">{fmt.currency(t.totalAmount)}</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </CardContent>
    </Card>

    <!-- Fund spend small multiples + Payment type donut -->
    <div class="grid md:grid-cols-2 gap-4">
        {#if fundSparklines.length > 0}
            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Fund spend</CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                    {#each fundSparklines as f (f.fundId)}
                        <div class="flex items-center gap-3">
                            <div class="flex flex-col w-32 shrink-0">
                                <span class="text-sm font-medium truncate">{f.fundName}</span>
                                <span class="text-xs font-mono text-muted-foreground">{fmt.currency(f.totalAmount)}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <Sparkline data={f.sparkData} color={f.fundColor ?? 'var(--chart-1)'} />
                            </div>
                            <button
                                class="text-muted-foreground hover:text-foreground"
                                onclick={() => goto(`/vaults/${vaultId}/funds/${f.fundId}`)}
                                aria-label="Open fund"
                            >
                                <ArrowRight class="size-4" />
                            </button>
                        </div>
                    {/each}
                </CardContent>
            </Card>
        {/if}

        <Card>
            <CardHeader>
                <CardTitle class="text-base">Payment types</CardTitle>
            </CardHeader>
            <CardContent>
                {#if paymentTypeResource.loading}
                    <div class="aspect-square flex items-center justify-center">
                        <div class="animate-spin rounded-full size-6 border-b-2 border-primary"></div>
                    </div>
                {:else if paymentTypeDonutData.length === 0}
                    <p class="text-sm text-muted-foreground py-12 text-center">No payment data.</p>
                {:else}
                    <CategoryDonut data={paymentTypeDonutData} topN={5} />
                {/if}
            </CardContent>
        </Card>
    </div>
</div>
