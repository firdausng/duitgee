<script lang="ts">
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { PLANS, FREE_PLAN_ID } from '$lib/configurations/plans';
    import Sparkles from '@lucide/svelte/icons/sparkles';
    import Check from '@lucide/svelte/icons/check';

    const proPlan = PLANS.find((p) => p.id === 'plan_pro')!;
    const freePlan = PLANS.find((p) => p.id === FREE_PLAN_ID)!;

    // Plans are per-vault in this app, so account-level "current plan" is informational.
    // The plan-per-vault display lives on the vault edit screen.
</script>

<div class="space-y-6">
    <Card>
        <CardHeader>
            <CardTitle>Your plans</CardTitle>
            <CardDescription>
                Plans are set per vault. Visit a vault's settings to change its plan.
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
            <div class="rounded-md border p-4 bg-muted/30">
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                        <p class="text-sm font-semibold">Free</p>
                        <p class="text-xs text-muted-foreground mt-0.5">Default plan for new vaults</p>
                    </div>
                </div>
                <ul class="mt-3 space-y-1.5 text-sm">
                    {#each freePlan.entitlements as entitlement (entitlement)}
                        <li class="flex items-center gap-2 text-muted-foreground">
                            <Check class="size-3.5 shrink-0" />
                            <code class="text-xs">{entitlement}</code>
                        </li>
                    {/each}
                </ul>
            </div>

            <div class="rounded-md border border-amber-300/60 dark:border-amber-700/60 p-4 bg-amber-50/50 dark:bg-amber-900/10">
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                        <p class="text-sm font-semibold flex items-center gap-1.5">
                            <Sparkles class="size-4 text-amber-500" />
                            Pro
                        </p>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            Multiple funds, automation, history, cross-fund settle, custom recurring
                        </p>
                    </div>
                </div>
                <ul class="mt-3 space-y-1.5 text-sm">
                    {#each proPlan.entitlements as entitlement (entitlement)}
                        <li class="flex items-center gap-2 text-muted-foreground">
                            <Check class="size-3.5 shrink-0 text-amber-500" />
                            <code class="text-xs">{entitlement}</code>
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
