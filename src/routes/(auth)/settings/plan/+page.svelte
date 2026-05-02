<script lang="ts">
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { ENTITLEMENT_LABELS, PRO_PLAN_ID } from '$lib/configurations/plans';
    import Sparkles from '@lucide/svelte/icons/sparkles';
    import Check from '@lucide/svelte/icons/check';
    import type { PageData } from './$types';

    interface Props {
        data: PageData;
    }
    const { data }: Props = $props();

    const isPro = $derived(data.userPlanId === PRO_PLAN_ID);
    const coveredCap = $derived(data.userPlan.limits.maxCoveredVaults);
    const overCap = $derived(
        coveredCap !== -1 && data.adminVaults.length > coveredCap,
    );
</script>

<div class="space-y-6">
    <Card>
        <CardHeader>
            <CardTitle>Your plan</CardTitle>
            <CardDescription>
                Pro applies to your account. Vaults you own or admin get Pro features for everyone in them, up to {data.proPlan.limits.maxCoveredVaults} vaults.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div
                class="rounded-md border p-4 {isPro
                    ? 'border-amber-300/60 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-900/10'
                    : 'bg-muted/30'}"
            >
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                        <p class="text-sm font-semibold flex items-center gap-1.5">
                            {#if isPro}
                                <Sparkles class="size-4 text-amber-500" />
                            {/if}
                            {data.userPlan.name}
                        </p>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            {#if isPro}
                                Pro entitlements active on your account.
                            {:else}
                                Default plan. Free is fully usable; Pro adds depth and scale.
                            {/if}
                        </p>
                    </div>
                    {#if !isPro}
                        <Button variant="default" disabled>Upgrade to Pro</Button>
                    {/if}
                </div>
            </div>
        </CardContent>
    </Card>

    {#if isPro}
        <Card>
            <CardHeader>
                <CardTitle>Vaults that benefit from your Pro</CardTitle>
                <CardDescription>
                    {#if data.adminVaults.length === 0}
                        You're not yet an owner or admin of any vault.
                    {:else if overCap}
                        Your Pro covers {coveredCap} of {data.adminVaults.length} vaults you own or admin. The rest fall back to Free.
                    {:else}
                        Every vault you own or admin gets Pro features for all members.
                    {/if}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {#if data.adminVaults.length === 0}
                    <p class="text-sm text-muted-foreground">
                        Create a vault or get promoted to admin in one to put your Pro to work.
                    </p>
                {:else}
                    <ul class="divide-y rounded-md border">
                        {#each data.adminVaults as vault (vault.id)}
                            {@const covered = vault.effectivePlanId === PRO_PLAN_ID}
                            <li class="flex items-center justify-between gap-3 px-3 py-2">
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="text-base">{vault.icon ?? '🏦'}</span>
                                    <div class="min-w-0">
                                        <p class="text-sm font-medium truncate">{vault.name}</p>
                                        <p class="text-xs text-muted-foreground capitalize">{vault.role}</p>
                                    </div>
                                </div>
                                {#if covered}
                                    <span class="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                        <Sparkles class="size-3" /> Pro
                                    </span>
                                {:else}
                                    <span class="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground">Free</span>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                    {#if overCap}
                        <p class="mt-3 text-xs text-muted-foreground">
                            A picker for choosing which vaults are covered is coming soon. For now, the {coveredCap} oldest vaults you own/admin are covered.
                        </p>
                    {/if}
                {/if}
            </CardContent>
        </Card>
    {/if}

    <Card>
        <CardHeader>
            <CardTitle>Plan comparison</CardTitle>
            <CardDescription>What's included on each plan.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
            <div class="rounded-md border p-4 bg-muted/30">
                <p class="text-sm font-semibold">Free</p>
                <ul class="mt-3 space-y-2 text-sm">
                    {#each data.freePlan.entitlements as entitlement (entitlement)}
                        {@const label = ENTITLEMENT_LABELS[entitlement]}
                        <li class="flex items-start gap-2">
                            <Check class="size-3.5 shrink-0 mt-1 text-muted-foreground" />
                            <div class="min-w-0">
                                <p class="text-foreground">{label.name}</p>
                                {#if label.description}
                                    <p class="text-xs text-muted-foreground">{label.description}</p>
                                {/if}
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>

            <div class="rounded-md border border-amber-300/60 dark:border-amber-700/60 p-4 bg-amber-50/50 dark:bg-amber-900/10">
                <p class="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles class="size-4 text-amber-500" />
                    Pro
                </p>
                <ul class="mt-3 space-y-2 text-sm">
                    {#each data.proPlan.entitlements as entitlement (entitlement)}
                        {@const label = ENTITLEMENT_LABELS[entitlement]}
                        <li class="flex items-start gap-2">
                            <Check class="size-3.5 shrink-0 mt-1 text-amber-500" />
                            <div class="min-w-0">
                                <p class="text-foreground">{label.name}</p>
                                {#if label.description}
                                    <p class="text-xs text-muted-foreground">{label.description}</p>
                                {/if}
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>
        </CardContent>
    </Card>

    <Card>
        <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Invoices and payment methods will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
            <p class="text-sm text-muted-foreground">Self-serve billing is coming soon.</p>
            <Button variant="outline" disabled class="mt-4">Manage billing</Button>
        </CardContent>
    </Card>
</div>
