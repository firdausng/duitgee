<script lang="ts">
    import { page } from '$app/state';
    import { useSearchParams } from 'runed/kit';
    import { resource } from 'runed';
    import { ofetch } from 'ofetch';
    import * as v from 'valibot';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import { Label } from '$lib/components/ui/label';
    import { DateRangeFilter } from '$lib/components/ui/date-range-filter';
    import { Eyebrow, Rule } from '$lib/components/almanac';
    import { Amount } from '$lib/components/ui/amount';
    import { IconRenderer } from '$lib/components/ui/icon-renderer';
    import { resolveBreakdown } from '$lib/utils/breakdown';
    import {
        getDateRange,
        localDatetimeToUtcIso,
        type DateFilter,
    } from '$lib/utils';
    import { createVaultFormatters } from '$lib/vaultFormatting';
    import type { VaultWithMember } from '$lib/schemas/read/vaultWithMember';
    import type { ScenarioBaseline } from '$lib/server/api/statistics/getScenarioBaselineHandler';
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
    import TrendingUp from '@lucide/svelte/icons/trending-up';
    import TrendingDown from '@lucide/svelte/icons/trending-down';
    import FlaskConical from '@lucide/svelte/icons/flask-conical';

    const { vaultId } = page.params;

    const paramsSchema = v.object({
        filter: v.optional(
            v.picklist(['today', 'yesterday', 'week', 'month', 'year', 'last7', 'last30', 'last90', 'custom']),
            'month',
        ),
        startDate: v.optional(v.fallback(v.string(), ''), ''),
        endDate: v.optional(v.fallback(v.string(), ''), ''),
    });

    const params = useSearchParams(paramsSchema);
    const filterType = $derived((params.filter ?? 'month') as DateFilter);

    function dateRangeFromFilter(): { start: string; end: string } {
        if (filterType === 'custom' && params.startDate && params.endDate) {
            return {
                start: localDatetimeToUtcIso(params.startDate),
                end: localDatetimeToUtcIso(params.endDate),
            };
        }
        const r = getDateRange(filterType);
        if (!r.startDate || !r.endDate) {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);
            return { start: start.toISOString(), end: end.toISOString() };
        }
        return { start: r.startDate, end: r.endDate };
    }

    const range = $derived(dateRangeFromFilter());

    function handleDateRangeChange(next: { filter: DateFilter; startDate?: string; endDate?: string }) {
        const safe = next.filter === 'all' ? 'month' : next.filter;
        params.filter = safe;
        params.startDate = next.startDate ?? '';
        params.endDate = next.endDate ?? '';
    }

    type Resp<T> = { success: boolean; data: T };

    const vaultResource = resource(
        () => [vaultId] as const,
        async ([id]) => {
            const r = await ofetch<Resp<VaultWithMember>>(`/api/getVault?vaultId=${id}`);
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

    const baselineResource = resource(
        () => [vaultId, range.start, range.end] as const,
        async ([id, start, end]) => {
            const qs = new URLSearchParams({ vaultId: id ?? '', start, end });
            const r = await ofetch<Resp<ScenarioBaseline>>(
                `/api/getScenarioBaseline?${qs.toString()}`,
            );
            return r.data;
        },
    );
    const baseline = $derived(baselineResource.current);

    // ─── Overrides (in-memory, period-scoped) ──────────────────────────
    type IncomeOverride = { disabled: boolean; baseAmount: number | null };
    type ExpenseOverride = { disabled: boolean; amount: number | null };

    let incomeOverrides = $state<Record<string, IncomeOverride>>({});
    let expenseOverrides = $state<Record<string, ExpenseOverride>>({});

    function resetOverrides() {
        incomeOverrides = {};
        expenseOverrides = {};
    }

    // When the period changes, clear overrides — rule set may differ.
    let lastRangeKey = $state('');
    $effect(() => {
        const key = `${range.start}|${range.end}`;
        if (key !== lastRangeKey) {
            lastRangeKey = key;
            resetOverrides();
        }
    });

    type ScenarioRow = {
        ruleId: string;
        name: string;
        icon: string | null;
        realPerPeriod: number;
        scenarioPerPeriod: number;
        disabled: boolean;
        baseValue: number;
    };

    const incomeRows = $derived.by<ScenarioRow[]>(() => {
        const rules = baseline?.recurringIncome ?? [];
        return rules.map((r) => {
            const o = incomeOverrides[r.ruleId];
            const disabled = o?.disabled ?? false;
            const base = o?.baseAmount ?? r.perPeriod.baseAmount;
            const scen = disabled
                ? 0
                : resolveBreakdown(base, r.breakdown.allowances, r.breakdown.deductions).gross;
            return {
                ruleId: r.ruleId,
                name: r.name,
                icon: r.icon,
                realPerPeriod: r.perPeriod.gross,
                scenarioPerPeriod: scen,
                disabled,
                baseValue: r.perPeriod.baseAmount,
            };
        });
    });

    const incomeDeductionsScenario = $derived.by(() => {
        const rules = baseline?.recurringIncome ?? [];
        return rules.reduce((sum, r) => {
            const o = incomeOverrides[r.ruleId];
            if (o?.disabled) return sum;
            const base = o?.baseAmount ?? r.perPeriod.baseAmount;
            const ded = resolveBreakdown(base, r.breakdown.allowances, r.breakdown.deductions).deductionsTotal;
            return sum + ded;
        }, 0);
    });

    const expenseRows = $derived.by<ScenarioRow[]>(() => {
        const rules = baseline?.recurringExpenses ?? [];
        return rules.map((r) => {
            const o = expenseOverrides[r.ruleId];
            const disabled = o?.disabled ?? false;
            const amount = o?.amount ?? r.perPeriod;
            return {
                ruleId: r.ruleId,
                name: r.name,
                icon: r.icon,
                realPerPeriod: r.perPeriod,
                scenarioPerPeriod: disabled ? 0 : amount,
                disabled,
                baseValue: r.perPeriod,
            };
        });
    });

    const scenarioIncome = $derived(
        incomeRows.reduce((s, r) => s + r.scenarioPerPeriod, 0) + (baseline?.oneOffIncome ?? 0),
    );
    const scenarioExpense = $derived(
        expenseRows.reduce((s, r) => s + r.scenarioPerPeriod, 0)
        + incomeDeductionsScenario
        + (baseline?.oneOffExpense ?? 0),
    );
    const scenarioNet = $derived(scenarioIncome - scenarioExpense);

    const realIncome = $derived(baseline?.real.income ?? 0);
    const realExpense = $derived(baseline?.real.expense ?? 0);
    const realNet = $derived(baseline?.real.net ?? 0);

    const deltaIncome = $derived(scenarioIncome - realIncome);
    const deltaExpense = $derived(scenarioExpense - realExpense);
    const deltaNet = $derived(scenarioNet - realNet);

    function toggleIncome(ruleId: string, enabled: boolean) {
        incomeOverrides = {
            ...incomeOverrides,
            [ruleId]: { ...(incomeOverrides[ruleId] ?? { baseAmount: null }), disabled: !enabled },
        };
    }
    function setIncomeBase(ruleId: string, raw: string) {
        const n = raw === '' ? null : Number(raw);
        incomeOverrides = {
            ...incomeOverrides,
            [ruleId]: {
                ...(incomeOverrides[ruleId] ?? { disabled: false, baseAmount: null }),
                baseAmount: n != null && Number.isFinite(n) ? n : null,
            },
        };
    }
    function toggleExpense(ruleId: string, enabled: boolean) {
        expenseOverrides = {
            ...expenseOverrides,
            [ruleId]: { ...(expenseOverrides[ruleId] ?? { amount: null }), disabled: !enabled },
        };
    }
    function setExpenseAmount(ruleId: string, raw: string) {
        const n = raw === '' ? null : Number(raw);
        expenseOverrides = {
            ...expenseOverrides,
            [ruleId]: {
                ...(expenseOverrides[ruleId] ?? { disabled: false, amount: null }),
                amount: n != null && Number.isFinite(n) ? n : null,
            },
        };
    }

    const hasAnyOverride = $derived(
        Object.keys(incomeOverrides).length > 0 || Object.keys(expenseOverrides).length > 0,
    );

    function deltaSignClass(n: number, positiveIsGood: boolean): string {
        if (n === 0) return 'text-muted-foreground';
        const good = positiveIsGood ? n > 0 : n < 0;
        return good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
    }

    function formatDelta(n: number): string {
        const v = fmt.currency(Math.abs(n));
        if (n === 0) return v;
        return (n > 0 ? '+' : '−') + v;
    }
</script>

<svelte:head>
    <title>Scenarios</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-6 space-y-6">
    <header class="space-y-2">
        <Eyebrow>Cash flow simulator</Eyebrow>
        <div class="flex items-center justify-between gap-3">
            <h1 class="flex items-center gap-2 text-2xl font-semibold">
                <FlaskConical class="size-6 text-muted-foreground" />
                Scenarios
            </h1>
            {#if hasAnyOverride}
                <Button variant="ghost" size="sm" onclick={resetOverrides}>
                    <RotateCcw class="mr-1 size-4" />
                    Reset
                </Button>
            {/if}
        </div>
        <p class="text-sm text-muted-foreground">
            Toggle a recurring income or expense off, or tweak its amount, to see how your cash flow
            changes for the selected period. Nothing here is saved.
        </p>
    </header>

    <DateRangeFilter
        value={filterType}
        startDate={params.startDate}
        endDate={params.endDate}
        onChange={handleDateRangeChange}
    />

    {#if baselineResource.loading && !baseline}
        <Card><CardContent class="py-8 text-center text-muted-foreground text-sm">Loading…</CardContent></Card>
    {:else if baseline}
        <!-- Summary: Real / Scenario / Δ -->
        <Card>
            <CardHeader>
                <CardTitle class="text-base">Period summary</CardTitle>
            </CardHeader>
            <CardContent class="grid grid-cols-1 gap-4 md:grid-cols-3 text-sm">
                <div>
                    <div class="text-xs uppercase tracking-wider text-muted-foreground">Real</div>
                    <div class="mt-2 space-y-1">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-muted-foreground">Income</span>
                            <Amount value={realIncome} sign="positive" showSign={false}
                                locale={vault?.locale || 'en-US'} currency={vault?.currency || 'USD'} />
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-muted-foreground">Expense</span>
                            <Amount value={-realExpense} sign="negative" showSign={false}
                                locale={vault?.locale || 'en-US'} currency={vault?.currency || 'USD'} />
                        </div>
                        <Rule />
                        <div class="flex items-center justify-between gap-2">
                            <span class="font-medium">Net</span>
                            <Amount value={realNet} sign={realNet >= 0 ? 'positive' : 'negative'}
                                locale={vault?.locale || 'en-US'} currency={vault?.currency || 'USD'} />
                        </div>
                    </div>
                </div>

                <div>
                    <div class="text-xs uppercase tracking-wider text-muted-foreground">Scenario</div>
                    <div class="mt-2 space-y-1">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-muted-foreground">Income</span>
                            <Amount value={scenarioIncome} sign="positive" showSign={false}
                                locale={vault?.locale || 'en-US'} currency={vault?.currency || 'USD'} />
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-muted-foreground">Expense</span>
                            <Amount value={-scenarioExpense} sign="negative" showSign={false}
                                locale={vault?.locale || 'en-US'} currency={vault?.currency || 'USD'} />
                        </div>
                        <Rule />
                        <div class="flex items-center justify-between gap-2">
                            <span class="font-medium">Net</span>
                            <Amount value={scenarioNet} sign={scenarioNet >= 0 ? 'positive' : 'negative'}
                                locale={vault?.locale || 'en-US'} currency={vault?.currency || 'USD'} />
                        </div>
                    </div>
                </div>

                <div>
                    <div class="text-xs uppercase tracking-wider text-muted-foreground">Difference</div>
                    <div class="mt-2 space-y-1">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-muted-foreground">Income</span>
                            <span class="font-mono {deltaSignClass(deltaIncome, true)}">{formatDelta(deltaIncome)}</span>
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-muted-foreground">Expense</span>
                            <span class="font-mono {deltaSignClass(deltaExpense, false)}">{formatDelta(deltaExpense)}</span>
                        </div>
                        <Rule />
                        <div class="flex items-center justify-between gap-2">
                            <span class="font-medium">Net</span>
                            <span class="font-mono font-semibold {deltaSignClass(deltaNet, true)}">{formatDelta(deltaNet)}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Income panel -->
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2 text-base">
                    <TrendingUp class="size-4 text-emerald-600 dark:text-emerald-400" />
                    Recurring income
                </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
                {#if incomeRows.length === 0}
                    <p class="text-sm text-muted-foreground">No active recurring income for this period.</p>
                {:else}
                    {#each incomeRows as row (row.ruleId)}
                        <div class="flex items-center gap-3 rounded-md border p-3" class:opacity-60={row.disabled}>
                            <IconRenderer icon={row.icon} size={20} emojiClass="text-lg" />
                            <div class="min-w-0 flex-1">
                                <div class="truncate text-sm font-medium">{row.name}</div>
                                <div class="text-xs text-muted-foreground">
                                    Real {fmt.currency(row.realPerPeriod)}
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <Label class="sr-only" for="inc-amt-{row.ruleId}">Base amount</Label>
                                <Input
                                    id="inc-amt-{row.ruleId}"
                                    type="number"
                                    inputmode="decimal"
                                    step="0.01"
                                    min="0"
                                    disabled={row.disabled}
                                    class="w-28"
                                    value={incomeOverrides[row.ruleId]?.baseAmount ?? ''}
                                    placeholder={String(row.baseValue)}
                                    oninput={(e) => setIncomeBase(row.ruleId, (e.currentTarget as HTMLInputElement).value)}
                                />
                                <Checkbox
                                    checked={!row.disabled}
                                    onCheckedChange={(v) => toggleIncome(row.ruleId, v === true)}
                                    aria-label="Include in scenario"
                                />
                            </div>
                        </div>
                    {/each}
                {/if}
            </CardContent>
        </Card>

        <!-- Expense panel -->
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2 text-base">
                    <TrendingDown class="size-4 text-rose-600 dark:text-rose-400" />
                    Recurring expenses
                </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
                {#if expenseRows.length === 0}
                    <p class="text-sm text-muted-foreground">No active recurring expenses for this period.</p>
                {:else}
                    {#each expenseRows as row (row.ruleId)}
                        <div class="flex items-center gap-3 rounded-md border p-3" class:opacity-60={row.disabled}>
                            <IconRenderer icon={row.icon} size={20} emojiClass="text-lg" />
                            <div class="min-w-0 flex-1">
                                <div class="truncate text-sm font-medium">{row.name}</div>
                                <div class="text-xs text-muted-foreground">
                                    Real {fmt.currency(row.realPerPeriod)}
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <Label class="sr-only" for="exp-amt-{row.ruleId}">Amount</Label>
                                <Input
                                    id="exp-amt-{row.ruleId}"
                                    type="number"
                                    inputmode="decimal"
                                    step="0.01"
                                    min="0"
                                    disabled={row.disabled}
                                    class="w-28"
                                    value={expenseOverrides[row.ruleId]?.amount ?? ''}
                                    placeholder={String(row.baseValue)}
                                    oninput={(e) => setExpenseAmount(row.ruleId, (e.currentTarget as HTMLInputElement).value)}
                                />
                                <Checkbox
                                    checked={!row.disabled}
                                    onCheckedChange={(v) => toggleExpense(row.ruleId, v === true)}
                                    aria-label="Include in scenario"
                                />
                            </div>
                        </div>
                    {/each}
                {/if}
            </CardContent>
        </Card>
    {:else}
        <Card>
            <CardContent class="py-8 text-center text-muted-foreground text-sm">
                Couldn't load the scenario baseline. You may not have permission to view income for
                this vault.
            </CardContent>
        </Card>
    {/if}
</div>
