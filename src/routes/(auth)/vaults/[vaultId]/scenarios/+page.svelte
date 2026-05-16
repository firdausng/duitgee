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
    import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
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
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';

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
    /** Group-level overrides, keyed by group key (template id, category name,
     *  or tag id). Toggle-only — total is derived from un-disabled children
     *  so per-expense toggles always move the number. */
    type GroupOverride = { disabled: boolean };
    let oneOffOverrides = $state<Record<string, GroupOverride>>({});
    /** Row-level overrides for individual one-off expenses inside a group.
     *  Toggle + amount edit — "drop this dinner" OR "what if it had been RM50". */
    type RowOverride = { disabled: boolean; amount: number | null };
    let expenseRowOverrides = $state<Record<string, RowOverride>>({});
    /** Which group rows are expanded to reveal their expense list. */
    let expandedGroups = $state<Record<string, boolean>>({});

    type GroupingMode = 'template' | 'category' | 'tag';
    let groupingMode = $state<GroupingMode>('template');

    function resetOverrides() {
        incomeOverrides = {};
        expenseOverrides = {};
        oneOffOverrides = {};
        expenseRowOverrides = {};
    }

    function changeGrouping(next: GroupingMode) {
        if (next === groupingMode) return;
        groupingMode = next;
        // Group keys mean different things in each mode, and row toggles
        // become invisible when their group moves — clear both so the
        // toggles you see fully explain the Scenario number.
        oneOffOverrides = {};
        expenseRowOverrides = {};
        expandedGroups = {};
    }

    function toggleExpanded(key: string) {
        expandedGroups = { ...expandedGroups, [key]: !expandedGroups[key] };
    }
    function toggleExpenseRow(id: string, enabled: boolean) {
        expenseRowOverrides = {
            ...expenseRowOverrides,
            [id]: { ...(expenseRowOverrides[id] ?? { amount: null }), disabled: !enabled },
        };
    }
    function setExpenseRowAmount(id: string, raw: string) {
        const n = raw === '' ? null : Number(raw);
        expenseRowOverrides = {
            ...expenseRowOverrides,
            [id]: {
                ...(expenseRowOverrides[id] ?? { disabled: false, amount: null }),
                amount: n != null && Number.isFinite(n) ? n : null,
            },
        };
    }

    // When the period changes, clear overrides — rule set may differ.
    let lastRangeKey = $state('');
    $effect(() => {
        const key = `${range.start}|${range.end}`;
        if (key !== lastRangeKey) {
            lastRangeKey = key;
            resetOverrides();
            expandedGroups = {};
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

    /** A single one-off expense as it appears inside an expanded group. */
    type ExpenseChild = {
        id: string;
        name: string;
        icon: string | null;
        date: string;
        realAmount: number;
        /** Effective amount for scenario math — override if set, else real. */
        scenarioAmount: number;
        disabled: boolean;
    };

    /** Visual row for the grouped one-off expense panel. One per group key. */
    type GroupRow = {
        key: string;
        name: string;
        icon: string | null;
        count: number;
        realTotal: number;
        scenarioTotal: number;
        disabled: boolean;
        /** Child expenses inside this group (already row-override-aware). */
        children: ExpenseChild[];
    };

    const UNGROUPED_KEY = '__ungrouped__';

    function buildChild(r: NonNullable<typeof baseline>['oneOffExpenses'][number]): ExpenseChild {
        const o = expenseRowOverrides[r.id];
        return {
            id: r.id,
            name: r.name,
            icon: r.icon,
            date: r.date,
            realAmount: r.amount,
            scenarioAmount: o?.amount ?? r.amount,
            disabled: o?.disabled ?? false,
        };
    }

    const groupRows = $derived.by<GroupRow[]>(() => {
        const rows = baseline?.oneOffExpenses ?? [];
        if (rows.length === 0) return [];

        type Bucket = {
            name: string;
            icon: string | null;
            total: number;
            children: ExpenseChild[];
        };

        if (groupingMode === 'template' || groupingMode === 'category') {
            const map = new Map<string, Bucket>();
            for (const r of rows) {
                const key = groupingMode === 'template'
                    ? (r.templateId ?? UNGROUPED_KEY)
                    : (r.categoryName || UNGROUPED_KEY);
                const name = groupingMode === 'template'
                    ? (r.templateName ?? 'Uncategorized')
                    : (r.categoryName || 'Uncategorized');
                const icon = groupingMode === 'template' ? r.icon : null;
                const entry = map.get(key) ?? { name, icon, total: 0, children: [] };
                entry.total += r.amount;
                entry.children.push(buildChild(r));
                map.set(key, entry);
            }
            return [...map.entries()]
                .map(([key, g]) => {
                    const disabled = oneOffOverrides[key]?.disabled ?? false;
                    const activeChildSum = g.children.reduce(
                        (s, c) => s + (c.disabled ? 0 : c.scenarioAmount),
                        0,
                    );
                    return {
                        key,
                        name: g.name,
                        icon: g.icon,
                        count: g.children.length,
                        realTotal: g.total,
                        scenarioTotal: disabled ? 0 : activeChildSum,
                        disabled,
                        children: g.children.sort((a, b) => b.realAmount - a.realAmount),
                    };
                })
                .sort((a, b) => b.realTotal - a.realTotal);
        }

        // Tag mode — expense may appear in multiple tag groups.
        const map = new Map<string, Bucket>();
        for (const r of rows) {
            const child = buildChild(r);
            if (r.tags.length === 0) {
                const entry = map.get(UNGROUPED_KEY) ?? { name: 'Untagged', icon: null, total: 0, children: [] };
                entry.total += r.amount;
                entry.children.push(child);
                map.set(UNGROUPED_KEY, entry);
            } else {
                for (const t of r.tags) {
                    const entry = map.get(t.id) ?? { name: t.name, icon: null, total: 0, children: [] };
                    entry.total += r.amount;
                    entry.children.push(child);
                    map.set(t.id, entry);
                }
            }
        }
        return [...map.entries()]
            .map(([key, g]) => {
                const disabled = oneOffOverrides[key]?.disabled ?? false;
                return {
                    key,
                    name: g.name,
                    icon: null,
                    count: g.children.length,
                    realTotal: g.total,
                    // Tag-group total is informational only — the real
                    // exclusion math runs over individual expenses in
                    // oneOffScenarioTotal.
                    scenarioTotal: disabled ? 0 : g.total,
                    disabled,
                    children: g.children.sort((a, b) => b.realAmount - a.realAmount),
                };
            })
            .sort((a, b) => b.realTotal - a.realTotal);
    });

    /** Tag mode runs the exclusion math directly over individual rows
     *  (union semantic + row-level toggle). Partition modes already account
     *  for both group amount overrides and child toggles via groupRows. */
    const oneOffScenarioTotal = $derived.by(() => {
        const rows = baseline?.oneOffExpenses ?? [];
        if (rows.length === 0) return 0;

        if (groupingMode === 'tag') {
            return rows.reduce((sum, r) => {
                const o = expenseRowOverrides[r.id];
                if (o?.disabled) return sum;
                const groupKeys = r.tags.length === 0
                    ? [UNGROUPED_KEY]
                    : r.tags.map((t) => t.id);
                const excluded = groupKeys.some((k) => oneOffOverrides[k]?.disabled);
                if (excluded) return sum;
                return sum + (o?.amount ?? r.amount);
            }, 0);
        }

        return groupRows.reduce((s, g) => s + g.scenarioTotal, 0);
    });

    const scenarioIncome = $derived(
        incomeRows.reduce((s, r) => s + r.scenarioPerPeriod, 0) + (baseline?.oneOffIncome ?? 0),
    );
    const scenarioExpense = $derived(
        expenseRows.reduce((s, r) => s + r.scenarioPerPeriod, 0)
        + incomeDeductionsScenario
        + oneOffScenarioTotal,
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
    function toggleGroup(key: string, enabled: boolean) {
        oneOffOverrides = { ...oneOffOverrides, [key]: { disabled: !enabled } };
    }

    const hasAnyOverride = $derived(
        Object.keys(incomeOverrides).length > 0
            || Object.keys(expenseOverrides).length > 0
            || Object.keys(oneOffOverrides).length > 0
            || Object.keys(expenseRowOverrides).length > 0,
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
                        <div class="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:gap-3" class:opacity-60={row.disabled}>
                            <div class="flex min-w-0 items-center gap-3">
                                <IconRenderer icon={row.icon} size={20} emojiClass="text-lg" />
                                <div class="min-w-0 flex-1">
                                    <div class="truncate text-sm font-medium">{row.name}</div>
                                    <div class="text-xs text-muted-foreground">
                                        Real {fmt.currency(row.realPerPeriod)}
                                        {#if !row.disabled && row.scenarioPerPeriod !== row.realPerPeriod}
                                            <span class="text-foreground"> → {fmt.currency(row.scenarioPerPeriod)}</span>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center justify-end gap-2 sm:ml-auto">
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
                        <div class="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:gap-3" class:opacity-60={row.disabled}>
                            <div class="flex min-w-0 items-center gap-3">
                                <IconRenderer icon={row.icon} size={20} emojiClass="text-lg" />
                                <div class="min-w-0 flex-1">
                                    <div class="truncate text-sm font-medium">{row.name}</div>
                                    <div class="text-xs text-muted-foreground">
                                        Real {fmt.currency(row.realPerPeriod)}
                                        {#if !row.disabled && row.scenarioPerPeriod !== row.realPerPeriod}
                                            <span class="text-foreground"> → {fmt.currency(row.scenarioPerPeriod)}</span>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center justify-end gap-2 sm:ml-auto">
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

        <!-- Other expenses — grouped by template / category / tag -->
        <Card>
            <CardHeader class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                    <CardTitle class="flex items-center gap-2 text-base">
                        <TrendingDown class="size-4 text-rose-600 dark:text-rose-400" />
                        Other expenses
                        <span class="text-xs font-normal text-muted-foreground">
                            ({baseline.oneOffExpenses.length})
                        </span>
                    </CardTitle>
                </div>
                <Tabs value={groupingMode} onValueChange={(v) => changeGrouping(v as GroupingMode)}>
                    <TabsList class="grid w-full grid-cols-3 md:w-auto md:inline-flex">
                        <TabsTrigger value="template">By template</TabsTrigger>
                        <TabsTrigger value="category">By category</TabsTrigger>
                        <TabsTrigger value="tag">By tag</TabsTrigger>
                    </TabsList>
                </Tabs>
                {#if groupingMode === 'tag'}
                    <p class="text-xs text-muted-foreground">
                        Expenses can carry multiple tags. Turning off a tag excludes every
                        expense bearing it — even if it's also in another tag group.
                    </p>
                {/if}
            </CardHeader>
            <CardContent class="space-y-3">
                {#if groupRows.length === 0}
                    <p class="text-sm text-muted-foreground">
                        No one-off expenses in this period.
                    </p>
                {:else}
                    {#each groupRows as row (row.key)}
                        {@const expanded = expandedGroups[row.key] === true}
                        <div class="rounded-md border" class:opacity-60={row.disabled}>
                            <div class="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
                                <div class="flex min-w-0 items-center gap-3">
                                    <button
                                        type="button"
                                        class="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                                        aria-label={expanded ? 'Collapse group' : 'Expand group'}
                                        aria-expanded={expanded}
                                        onclick={() => toggleExpanded(row.key)}
                                    >
                                        {#if expanded}
                                            <ChevronDown class="size-4" />
                                        {:else}
                                            <ChevronRight class="size-4" />
                                        {/if}
                                    </button>
                                    <IconRenderer icon={row.icon} size={20} emojiClass="text-lg" />
                                    <div class="min-w-0 flex-1">
                                        <div class="truncate text-sm font-medium">{row.name}</div>
                                        <div class="text-xs text-muted-foreground">
                                            {row.count} {row.count === 1 ? 'expense' : 'expenses'} · Real {fmt.currency(row.realTotal)}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center justify-end gap-3 sm:ml-auto">
                                    <div class="text-right">
                                        <div class="text-[10px] uppercase tracking-wider text-muted-foreground">Scenario</div>
                                        <div class="font-mono text-sm tabular-nums">{fmt.currency(row.scenarioTotal)}</div>
                                    </div>
                                    <Checkbox
                                        checked={!row.disabled}
                                        onCheckedChange={(v) => toggleGroup(row.key, v === true)}
                                        aria-label="Include in scenario"
                                    />
                                </div>
                            </div>
                            {#if expanded}
                                <ul class="divide-y border-t bg-muted/30">
                                    {#each row.children as child (child.id)}
                                        <li
                                            class="flex flex-col gap-2 px-3 py-2 pl-6 sm:flex-row sm:items-center sm:gap-3 sm:pl-12"
                                            class:opacity-60={child.disabled}
                                        >
                                            <div class="min-w-0 flex-1">
                                                <div class="truncate text-sm">{child.name}</div>
                                                <div class="text-[11px] text-muted-foreground">
                                                    {fmt.date(child.date)} · Real {fmt.currency(child.realAmount)}
                                                    {#if !child.disabled && child.scenarioAmount !== child.realAmount}
                                                        <span class="text-foreground"> → {fmt.currency(child.scenarioAmount)}</span>
                                                    {/if}
                                                </div>
                                            </div>
                                            <div class="flex items-center justify-end gap-2 sm:ml-auto">
                                                <Label class="sr-only" for="row-amt-{child.id}">Amount</Label>
                                                <Input
                                                    id="row-amt-{child.id}"
                                                    type="number"
                                                    inputmode="decimal"
                                                    step="0.01"
                                                    min="0"
                                                    disabled={child.disabled}
                                                    class="h-8 w-24 text-sm"
                                                    value={expenseRowOverrides[child.id]?.amount ?? ''}
                                                    placeholder={String(child.realAmount.toFixed(2))}
                                                    oninput={(e) => setExpenseRowAmount(child.id, (e.currentTarget as HTMLInputElement).value)}
                                                />
                                                <Checkbox
                                                    checked={!child.disabled}
                                                    onCheckedChange={(v) => toggleExpenseRow(child.id, v === true)}
                                                    aria-label="Include this expense"
                                                />
                                            </div>
                                        </li>
                                    {/each}
                                </ul>
                            {/if}
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
