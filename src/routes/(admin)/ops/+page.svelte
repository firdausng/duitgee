<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    import Loader2 from '@lucide/svelte/icons/loader-2';
    import Play from '@lucide/svelte/icons/play';
    import Users from '@lucide/svelte/icons/users';
    import UserX from '@lucide/svelte/icons/user-x';
    import UserPlus from '@lucide/svelte/icons/user-plus';
    import Wallet from '@lucide/svelte/icons/wallet';
    import Crown from '@lucide/svelte/icons/crown';
    import PiggyBank from '@lucide/svelte/icons/piggy-bank';
    import Receipt from '@lucide/svelte/icons/receipt';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';

    let { data } = $props();

    let nowOverride = $state('');
    let selectedFundId = $state('');
    let loading = $state(false);
    let result = $state<null | {
        processed: number;
        rolled: number;
        replenished: number;
        skipped: number;
        errors: Array<{ fundId: string; message: string }>;
    }>(null);
    let errorMessage = $state<string | null>(null);

    let recurringNowOverride = $state('');
    let selectedRuleId = $state('');
    let recurringLoading = $state(false);
    let recurringResult = $state<null | {
        rulesProcessed: number;
        autoCreated: number;
        queued: number;
        ended: number;
        skipped: number;
        errors: Array<{ ruleId: string; message: string }>;
    }>(null);
    let recurringError = $state<string | null>(null);

    const statItems = $derived([
        { label: 'Users', value: data.stats.users, icon: Users },
        { label: 'Anonymous', value: data.stats.anonymousUsers, icon: UserX },
        { label: '7-day signups', value: data.stats.recentSignups, icon: UserPlus },
        { label: 'Vaults', value: data.stats.vaults, icon: Wallet },
        { label: 'Pro vaults', value: data.stats.proVaults, icon: Crown },
        { label: 'Active funds', value: data.stats.funds, icon: PiggyBank },
        { label: 'Expenses', value: data.stats.expenses, icon: Receipt },
        { label: 'Recurring', value: data.stats.recurring, icon: RefreshCw },
    ]);

    async function triggerCron() {
        loading = true;
        result = null;
        errorMessage = null;
        try {
            const body: Record<string, string> = {};
            if (nowOverride) body.now = new Date(nowOverride).toISOString();
            if (selectedFundId) body.fundId = selectedFundId;

            const res = await fetch('/api/ops/cron/funds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const json = (await res.json()) as {
                success: boolean;
                data?: typeof result;
                error?: string;
            };

            if (!res.ok || !json.success) {
                errorMessage = json.error ?? `Error ${res.status}`;
                return;
            }
            result = json.data ?? null;
        } catch (err) {
            errorMessage = err instanceof Error ? err.message : 'Unknown error';
        } finally {
            loading = false;
        }
    }

    async function triggerRecurringCron() {
        recurringLoading = true;
        recurringResult = null;
        recurringError = null;
        try {
            const body: Record<string, string> = {};
            if (recurringNowOverride) body.now = new Date(recurringNowOverride).toISOString();
            if (selectedRuleId) body.ruleId = selectedRuleId;

            const res = await fetch('/api/ops/cron/recurring-expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const json = (await res.json()) as {
                success: boolean;
                data?: typeof recurringResult;
                error?: string;
            };

            if (!res.ok || !json.success) {
                recurringError = json.error ?? `Error ${res.status}`;
                return;
            }
            recurringResult = json.data ?? null;
        } catch (err) {
            recurringError = err instanceof Error ? err.message : 'Unknown error';
        } finally {
            recurringLoading = false;
        }
    }
</script>

<div class="space-y-6">
    <div>
        <h1 class="text-2xl font-semibold">Admin</h1>
        <p class="text-sm text-muted-foreground">
            Manual triggers and internal tooling.
        </p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {#each statItems as item}
            {@const Icon = item.icon}
            <Card>
                <CardContent class="pt-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
                            <p class="text-2xl font-semibold font-mono">{item.value.toLocaleString()}</p>
                        </div>
                        <Icon class="size-6 text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        {/each}
    </div>

    <Card>
        <CardHeader>
            <CardTitle>Run fund-cycle cron</CardTitle>
            <CardDescription>
                Rolls over expired cycles and applies auto-replenishment for pro vaults.
                Leave fields blank to run with "now" against all due funds.
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <Label for="cron-now">Override now (local datetime)</Label>
                    <Input
                        id="cron-now"
                        type="datetime-local"
                        bind:value={nowOverride}
                        disabled={loading}
                    />
                    <p class="text-xs text-muted-foreground">
                        Optional. Sent as UTC ISO to simulate a specific run time.
                    </p>
                </div>

                <div class="space-y-1.5">
                    <Label for="cron-fund">Scope to fund (optional)</Label>
                    <select
                        id="cron-fund"
                        bind:value={selectedFundId}
                        disabled={loading}
                        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">All due funds</option>
                        {#each data.fundsWithPolicy as fund}
                            <option value={fund.fundId}>
                                {fund.vaultName} — {fund.fundName} ({fund.replenishmentType}, ends {fund.periodEnd?.slice(0, 10) ?? 'n/a'})
                            </option>
                        {/each}
                    </select>
                    <p class="text-xs text-muted-foreground">
                        {data.fundsWithPolicy.length} fund{data.fundsWithPolicy.length === 1 ? '' : 's'} with a replenishment schedule.
                    </p>
                </div>
            </div>

            <div class="flex justify-end">
                <Button onclick={triggerCron} disabled={loading}>
                    {#if loading}
                        <Loader2 class="size-4 animate-spin" />
                        Processing...
                    {:else}
                        <Play class="size-4" />
                        Run
                    {/if}
                </Button>
            </div>

            {#if result}
                <div class="rounded-md bg-muted p-4 text-sm space-y-1">
                    <p class="font-medium">Result</p>
                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
                        <div><span class="text-muted-foreground">processed</span> {result.processed}</div>
                        <div><span class="text-muted-foreground">rolled</span> {result.rolled}</div>
                        <div><span class="text-muted-foreground">replenished</span> {result.replenished}</div>
                        <div><span class="text-muted-foreground">skipped</span> {result.skipped}</div>
                        <div class:text-destructive={result.errors.length > 0}>
                            <span class="text-muted-foreground">errors</span> {result.errors.length}
                        </div>
                    </div>
                    {#if result.errors.length > 0}
                        <div class="pt-2">
                            <p class="font-medium text-destructive">Errors:</p>
                            <ul class="list-disc pl-5 font-mono text-xs">
                                {#each result.errors as e}
                                    <li>{e.fundId}: {e.message}</li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </div>
            {/if}

            {#if errorMessage}
                <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {errorMessage}
                </div>
            {/if}
        </CardContent>
    </Card>

    <Card>
        <CardHeader>
            <CardTitle>Run recurring-expenses cron</CardTitle>
            <CardDescription>
                Materialises due recurring rules — auto rules create expenses, queue rules
                land in each vault's pending inbox. Leave fields blank to run against every
                active rule whose next occurrence is due.
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <Label for="recurring-now">Override now (local datetime)</Label>
                    <Input
                        id="recurring-now"
                        type="datetime-local"
                        bind:value={recurringNowOverride}
                        disabled={recurringLoading}
                    />
                    <p class="text-xs text-muted-foreground">
                        Optional. Sent as UTC ISO to simulate a specific run time.
                    </p>
                </div>

                <div class="space-y-1.5">
                    <Label for="recurring-rule">Scope to rule (optional)</Label>
                    <select
                        id="recurring-rule"
                        bind:value={selectedRuleId}
                        disabled={recurringLoading}
                        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">All due rules</option>
                        {#each data.recurringRules as rule}
                            <option value={rule.ruleId}>
                                {rule.vaultName} — {rule.ruleName || rule.templateName || 'rule'}
                                ({rule.generationMode}, every {rule.scheduleInterval} {rule.scheduleUnit},
                                next {rule.nextOccurrenceAt?.slice(0, 16) ?? 'n/a'})
                            </option>
                        {/each}
                    </select>
                    <p class="text-xs text-muted-foreground">
                        {data.recurringRules.length} active rule{data.recurringRules.length === 1 ? '' : 's'} across all vaults.
                    </p>
                </div>
            </div>

            <div class="flex justify-end">
                <Button onclick={triggerRecurringCron} disabled={recurringLoading}>
                    {#if recurringLoading}
                        <Loader2 class="size-4 animate-spin" />
                        Processing...
                    {:else}
                        <Play class="size-4" />
                        Run
                    {/if}
                </Button>
            </div>

            {#if recurringResult}
                <div class="rounded-md bg-muted p-4 text-sm space-y-1">
                    <p class="font-medium">Result</p>
                    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
                        <div><span class="text-muted-foreground">rulesProcessed</span> {recurringResult.rulesProcessed}</div>
                        <div><span class="text-muted-foreground">autoCreated</span> {recurringResult.autoCreated}</div>
                        <div><span class="text-muted-foreground">queued</span> {recurringResult.queued}</div>
                        <div><span class="text-muted-foreground">ended</span> {recurringResult.ended}</div>
                        <div><span class="text-muted-foreground">skipped</span> {recurringResult.skipped}</div>
                        <div class:text-destructive={recurringResult.errors.length > 0}>
                            <span class="text-muted-foreground">errors</span> {recurringResult.errors.length}
                        </div>
                    </div>
                    {#if recurringResult.errors.length > 0}
                        <div class="pt-2">
                            <p class="font-medium text-destructive">Errors:</p>
                            <ul class="list-disc pl-5 font-mono text-xs">
                                {#each recurringResult.errors as e}
                                    <li>{e.ruleId}: {e.message}</li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </div>
            {/if}

            {#if recurringError}
                <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {recurringError}
                </div>
            {/if}
        </CardContent>
    </Card>
</div>
