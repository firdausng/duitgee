<script lang="ts">
    import {goto} from "$app/navigation";
    import {onMount} from "svelte";
    import {useSearchParams} from "runed/kit";
    import {ofetch} from "ofetch";
    import {resource} from "runed";
    import type {VaultWithMember} from "$lib/schemas/read/vaultWithMember";
    import {Button} from "$lib/components/ui/button";
    import {Card, CardContent} from "$lib/components/ui/card";
    import {filterSchema} from "./schemas";
    import type {VaultStatistics} from "./types";
    import InviteForm from "./InviteForm.svelte";
    import {LoadingOverlay} from "$lib/components/ui/loading-overlay";
    import {Toaster} from "$lib/components/ui/sonner";
    import {toast} from "svelte-sonner";
    import {localDatetimeToUtcIso, getDateRange, getPriorDateRange, type DateFilter} from "$lib/utils";
    import {createVaultFormatters} from "$lib/vaultFormatting";
    import {page} from "$app/state";
    import { RecentExpenses } from "$lib/components/ui/recent-expenses";
    import { EmptyState } from "$lib/components/ui/empty-state";
    import {
        SpendHeroCard,
        PendingActionsCard,
        CategoryBreakdownCard,
        EmptyVaultChecklist,
        RecurringCommitmentsCard,
        type RecurringCommitmentsUpcoming,
    } from "$lib/components/home";
    import { UnidentifiedCard } from "$lib/components/home/unidentified";
    import type { RecurringRule } from "$lib/recurring-helpers";
    import ArrowRight from "@lucide/svelte/icons/arrow-right";
    import ExternalLink from "@lucide/svelte/icons/external-link";
    import Receipt from "@lucide/svelte/icons/receipt";
    import Plus from "@lucide/svelte/icons/plus";
    import Globe from "@lucide/svelte/icons/globe";
    import CalendarDays from "@lucide/svelte/icons/calendar-days";
    import type { Expense } from "./types";

    const GROUP_BY_DAY_STORAGE_KEY = 'dg:expenses:groupByDay';

    // Required route param — SvelteKit guarantees it but the generated type stays loose.
    const vaultId = page.params.vaultId as string;

    const params = useSearchParams(filterSchema);

    // Funds resource
    type FundRow = {
        fund: { id: string; name: string; color: string | null; icon: string | null; balance: number; status: string };
        activeCycle: { openingBalance: number; topUpAmount: number; totalSpent: number; totalReimbursed: number; totalDeducted: number } | null;
    };
    let fundsRefetchKey = $state(0);
    const fundsResource = resource(
        () => [vaultId, fundsRefetchKey] as const,
        async ([id]) => {
            const response = await ofetch<{ success: boolean; data: FundRow[] }>(`/api/getFunds?vaultId=${id}`);
            return (response.data ?? []).filter((r) => r.fund.status === 'active');
        }
    );
    const fundRows = $derived(fundsResource.current ?? []);

    // Refetch keys to trigger data reload (e.g., after delete/update)
    let refetchKey = $state(0);
    let vaultRefetchKey = $state(0);

    // Fund filter state — persisted in URL
    const selectedFundId = $derived(params.fundId || null);

    // UI state
    let showInviteForm = $state(false);
    let inviteEmail = $state('');
    let inviteRole = $state<'admin' | 'member'>('member');
    let isInviting = $state(false);
    let groupByDay = $state(false);

    // Per-vault dismissal of the empty-vault welcome checklist.
    const checklistDismissalKey = $derived(`dg:checklist-dismissed:${vaultId}`);
    let checklistDismissed = $state(false);
    onMount(() => {
        groupByDay = localStorage.getItem(GROUP_BY_DAY_STORAGE_KEY) === 'true';
        checklistDismissed = localStorage.getItem(checklistDismissalKey) === 'true';
    });
    function dismissChecklist() {
        checklistDismissed = true;
        try {
            localStorage.setItem(checklistDismissalKey, 'true');
        } catch {
            // ignore
        }
    }

    function toggleGroupByDay() {
        groupByDay = !groupByDay;
        localStorage.setItem(GROUP_BY_DAY_STORAGE_KEY, String(groupByDay));
    }

    // Filter state - derived from URL query params
    let filterType = $derived(params.filter as DateFilter);

    function getDateRangeWithCustom(): { startDate?: string; endDate?: string } {
        if (filterType === 'custom' && params.startDate && params.endDate) {
            return {
                startDate: localDatetimeToUtcIso(params.startDate),
                endDate: localDatetimeToUtcIso(params.endDate)
            };
        }
        return getDateRange(filterType);
    }

    // Resource for vault data
    const vaultResource = resource(
        () => [vaultId, vaultRefetchKey] as const,
        async ([id]) => {
            const response = await ofetch<{ success: boolean, data: VaultWithMember }>(`/api/getVault?vaultId=${id}`);
            return response.data;
        },
        {
            debounce: 300,
        }
    );

    // Resource for statistics - auto-refetches when filter changes
    const statisticsResource = resource(
        () => {
            // Only include startDate/endDate in dependencies for custom filters
            if (filterType === 'custom') {
                return [vaultId, filterType, params.startDate, params.endDate, refetchKey, selectedFundId] as const;
            }
            return [vaultId, filterType, refetchKey, selectedFundId] as const;
        },
        async (deps) => {
            const dateRange = getDateRangeWithCustom();
            const urlParams = new URLSearchParams({
                vaultId: deps[0],
                    ...dateRange
            });

            if (selectedFundId) urlParams.append('fundId', selectedFundId);

            const response = await ofetch<{ success: boolean, data: VaultStatistics }>(`/api/getVaultStatistics?${urlParams.toString()}`);
            return response.data;
        },
        {
            debounce: 300,
        }
    );

    // Resource for the prior period — drives the SpendHeroCard delta caption.
    // Only fetched when there's a meaningful comparison (skip 'all').
    const priorStatsResource = resource(
        () => {
            if (filterType === 'custom') {
                return [vaultId, filterType, params.startDate, params.endDate, refetchKey, selectedFundId] as const;
            }
            return [vaultId, filterType, refetchKey, selectedFundId] as const;
        },
        async (deps) => {
            if (filterType === 'all') return null;
            const range = getPriorDateRange(
                filterType,
                filterType === 'custom' && params.startDate
                    ? localDatetimeToUtcIso(params.startDate)
                    : undefined,
                filterType === 'custom' && params.endDate
                    ? localDatetimeToUtcIso(params.endDate)
                    : undefined,
            );
            if (!range.startDate || !range.endDate) return null;
            const urlParams = new URLSearchParams({ vaultId: deps[0], ...range });
            if (selectedFundId) urlParams.append('fundId', selectedFundId);
            const response = await ofetch<{ success: boolean; data: VaultStatistics }>(
                `/api/getVaultStatistics?${urlParams.toString()}`,
            );
            return response.data;
        },
        { debounce: 300 },
    );

    // All-time expense count — drives the empty-vault checklist signal.
    // Cheap, cached query that ignores date filters.
    const allTimeCountResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            try {
                const res = await ofetch<{ success: boolean; data: VaultStatistics }>(
                    `/api/getVaultStatistics?vaultId=${id}`,
                );
                return res.data?.total?.count ?? 0;
            } catch {
                return 1; // fail-safe — don't show checklist if the API errors
            }
        },
    );

    // Pending recurring count — for the PendingActionsCard.
    const pendingRecurringResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            try {
                const res = await ofetch<{ success: boolean; data: unknown[] }>(
                    `/api/getPendingOccurrences?vaultId=${id}`,
                );
                return (res.data ?? []).length;
            } catch {
                return 0;
            }
        },
    );

    // Active recurring rules — drives the RecurringCommitmentsCard headline + counts.
    const recurringRulesResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            try {
                const res = await ofetch<{ success: boolean; data: RecurringRule[] }>(
                    `/api/getRecurringExpenses?vaultId=${id}`,
                );
                return res.data ?? [];
            } catch {
                return [] as RecurringRule[];
            }
        },
    );

    // Upcoming dues in the next 7 days — feeds the card's preview list.
    const upcomingRecurringResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            try {
                const res = await ofetch<{
                    success: boolean;
                    data: RecurringCommitmentsUpcoming[];
                }>(`/api/getUpcomingOccurrences?vaultId=${id}&days=7`);
                return res.data ?? [];
            } catch {
                return [] as RecurringCommitmentsUpcoming[];
            }
        },
    );

    // Pending reimbursements (Pro only — gracefully no-op for free).
    type ReimbRow = { expense: { amount: number } };
    const pendingReimbursementsResource = resource(
        () => [vaultId, refetchKey] as const,
        async ([id]) => {
            try {
                const res = await ofetch<{ success: boolean; data: ReimbRow[] }>(
                    `/api/getVaultPendingReimbursements?vaultId=${id}`,
                );
                const items = res.data ?? [];
                // pending_reimbursement transactions have amount 0; the gross total comes from the linked expense.
                return {
                    count: items.length,
                    total: items.reduce((sum, r) => sum + (r.expense?.amount ?? 0), 0),
                };
            } catch {
                // 403 (no entitlement) or any other error → treat as empty.
                return { count: 0, total: 0 };
            }
        },
    );

    // Resource for expenses - auto-refetches when filter changes
    const expensesResource = resource(
        () => {
            // Include startDate/endDate in dependencies for custom filters
            if (filterType === 'custom') {
                return [vaultId, filterType, params.startDate, params.endDate, refetchKey, selectedFundId] as const;
            }
            return [vaultId, filterType, refetchKey, selectedFundId] as const;
        },
        async (deps) => {
            const dateRange = getDateRangeWithCustom();
            const urlParams = new URLSearchParams({
                vaultId: deps[0],
                page: '1',
                limit: '100'
            });

            if (dateRange.startDate) urlParams.append('startDate', dateRange.startDate);
            if (dateRange.endDate) urlParams.append('endDate', dateRange.endDate);
            if (selectedFundId) urlParams.append('fundId', selectedFundId);

            const response = await ofetch<{ expenses: Expense[]; pagination: any }>(
                `/api/getExpenses?${urlParams.toString()}`
            );
            return response.expenses || [];
        },
        {
            debounce: 300,
        }
    );

    // Derive data from resources
    const currentVault = $derived(vaultResource.current);
    const statistics = $derived(statisticsResource.current || null);
    const priorStats = $derived(priorStatsResource.current || null);
    const expenses = $derived(expensesResource.current || []);
    const pendingRecurringCount = $derived(pendingRecurringResource.current ?? 0);
    const pendingReimbursements = $derived(
        pendingReimbursementsResource.current ?? { count: 0, total: 0 },
    );
    const allTimeExpenseCount = $derived(allTimeCountResource.current ?? null);
    const isEmptyVault = $derived(allTimeExpenseCount === 0);
    const showChecklist = $derived(isEmptyVault && !checklistDismissed);
    const recurringRules = $derived(recurringRulesResource.current ?? []);
    const upcomingRecurring = $derived(upcomingRecurringResource.current ?? []);
    const isLoadingRecurring = $derived(
        recurringRulesResource.loading || upcomingRecurringResource.loading,
    );
    const isLoadingVault = $derived(vaultResource.loading);
    const isLoadingStats = $derived(statisticsResource.loading);
    const isLoadingExpenses = $derived(expensesResource.loading);
    const vaultError = $derived(vaultResource.error);
    const statisticsError = $derived(statisticsResource.error);

    // Members + current user — used by the unidentified card for paidBy selection.
    const vaultMembersList = $derived(currentVault?.members ?? []);
    const currentUserId = $derived(page.data.currentSession?.user?.id ?? '');
    const hasSharedMembers = $derived(vaultMembersList.length > 1);

    // Create vault-specific formatters
    const vaultFormatters = $derived(
        currentVault
            ? createVaultFormatters({
                locale: currentVault.vaults.locale || 'en-US',
                currency: currentVault.vaults.currency || 'USD'
            })
            : createVaultFormatters({ locale: 'en-US', currency: 'USD' })
    );

    $effect(() => {
        if (statisticsError) {
            toast.error('Failed to load statistics. Please try again.');
        }
    });

    function handleRetryExpenses() {
        refetchKey++;
    }

    function handleCreateExpense() {
        const returnTo = page.url.pathname + page.url.search;
        const qs = new URLSearchParams({ returnTo });
        goto(`/vaults/${vaultId}/expenses/new?${qs.toString()}`);
    }

    function handleEditExpense(expenseId: string) {
        goto(`/vaults/${vaultId}/expenses/${expenseId}/edit`);
    }

    async function handleDeleteExpense(expenseId: string) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            await ofetch('/api/deleteExpense', {
                method: 'POST',
                body: JSON.stringify({id: expenseId, vaultId}),
                headers: {'Content-Type': 'application/json'}
            });

            // Trigger refetch of expenses and statistics
            refetchKey++;
        } catch (error) {
            console.error('Failed to delete expense:', error);
            alert('Failed to delete expense. Please try again.');
        }
    }

    function handleBack() {
        goto('/vaults');
    }

    function toggleFundFilter(fundId: string) {
        if (params.fundId === fundId) {
            params.fundId = '';
        } else {
            params.fundId = fundId;
        }
    }

    function toggleInviteForm() {
        showInviteForm = !showInviteForm;
        if (!showInviteForm) {
            // Reset form when closing
            inviteEmail = '';
            inviteRole = 'member';
        }
    }

    async function handleInviteUser() {
        if (!inviteEmail.trim()) {
            alert('Please enter an email address');
            return;
        }

        isInviting = true;

        try {
            const response = await ofetch('/api/createInvitation', {
                method: 'POST',
                body: {
                    vaultId,
                    inviteeEmail: inviteEmail.trim(),
                    role: inviteRole
                },
                headers: {'Content-Type': 'application/json'}
            });

            if (response.success) {
                alert(`Invitation sent to ${inviteEmail}`);
                // Reset form
                inviteEmail = '';
                inviteRole = 'member';
                showInviteForm = false;
            } else {
                throw new Error(response.error || 'Failed to send invitation');
            }
        } catch (error: any) {
            console.error('Failed to invite user:', error);
            const errorMessage = error?.data?.error || error?.message || 'Failed to send invitation. Please try again.';
            alert(errorMessage);
        } finally {
            isInviting = false;
        }
    }

    function handleStatisticsCardClick(type: 'template' | 'category' | 'member', id: string | null, name: string) {
        // Navigate to statistics page with filter parameters
        const searchParams = new URLSearchParams();
        searchParams.set('filterType', type);
        searchParams.set('filterName', name);

        // Preserve current date filter if any
        if (filterType && filterType !== 'all') {
            searchParams.set('filter', filterType);
            if (filterType === 'custom' && params.startDate && params.endDate) {
                searchParams.set('startDate', params.startDate);
                searchParams.set('endDate', params.endDate);
            }
        }

        goto(`/vaults/${vaultId}/statistics?${searchParams.toString()}`);
    }

</script>

<svelte:head>
    <title>{currentVault?.vaults.name || 'Vault'} - DuitGee</title>
</svelte:head>

<div class="container mx-auto py-2 px-4 relative">
    {#if isLoadingVault}
        <!-- Loading State -->
        <div class="flex flex-col items-center justify-center py-16">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p class="mt-4 text-muted-foreground">Loading vault...</p>
        </div>
    {:else if vaultError}
        <!-- API Error State -->
        <Card class="border-destructive">
            <CardContent class="flex flex-col items-center justify-center py-16 px-4">
                <div class="rounded-full bg-destructive/10 p-6 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-destructive" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <h2 class="text-2xl font-semibold mb-2">Failed to load vault</h2>
                <p class="text-muted-foreground text-center max-w-md mb-2">
                    An error occurred while loading the vault data.
                </p>
                <p class="text-sm text-destructive text-center max-w-md mb-6">
                    {vaultError?.message || 'Please check your connection and try again.'}
                </p>
                <div class="flex gap-3">
                    <Button variant="outline" onclick={handleBack}>
                        Back to Vaults
                    </Button>
                </div>
            </CardContent>
        </Card>
    {:else if !currentVault}
        <!-- Not Found State -->
        <Card class="border-destructive">
            <CardContent class="flex flex-col items-center justify-center py-16 px-4">
                <div class="rounded-full bg-destructive/10 p-6 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-destructive" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <h2 class="text-2xl font-semibold mb-2">Vault not found</h2>
                <p class="text-muted-foreground text-center max-w-md mb-6">
                    The vault you're looking for doesn't exist or you don't have access to it.
                </p>
                <Button onclick={handleBack}>
                    Back to Vaults
                </Button>
            </CardContent>
        </Card>
    {:else}
        <LoadingOverlay show={isLoadingStats || isLoadingExpenses} />
        <!-- Vault title, ★ default-star, Edit, Invite, and "Add expense" all live
             in <DesktopAppBar> (auth layout) now — page jumps straight to content. -->

        <!-- Invite User Form -->
        <InviteForm
                show={showInviteForm}
                email={inviteEmail}
                role={inviteRole}
                isInviting={isInviting}
                onEmailChange={(value) => inviteEmail = value}
                onRoleChange={(role) => inviteRole = role}
                onSubmit={handleInviteUser}
                onCancel={toggleInviteForm}
        />

        <!-- Spend hero — replaced by the welcome checklist for brand-new vaults. -->
        <div class="mb-3">
            {#if showChecklist}
                <EmptyVaultChecklist
                    {vaultId}
                    hasFunds={fundRows.length > 0}
                    memberCount={currentVault.vaultMembers ? 1 : 1}
                    onAddExpense={handleCreateExpense}
                    onCreateFund={() => goto(`/vaults/${vaultId}/funds/new`)}
                    onInviteMember={() => { showInviteForm = true; }}
                    onDismiss={dismissChecklist}
                />
            {:else}
                <SpendHeroCard
                    {filterType}
                    currentAmount={statistics?.total.amount ?? 0}
                    currentCount={statistics?.total.count ?? 0}
                    priorAmount={priorStats?.total.amount ?? null}
                    loading={isLoadingStats}
                    onFilterChange={(filter) => { params.filter = filter; }}
                    formatCurrency={vaultFormatters.currency}
                />
            {/if}
        </div>

        <!-- Pending actions — recurring approvals + cross-fund reimbursements (conditional) -->
        <div class="mb-3">
            <PendingActionsCard
                {vaultId}
                {pendingRecurringCount}
                pendingReimbursementsCount={pendingReimbursements.count}
                pendingReimbursementsTotal={pendingReimbursements.total}
                formatCurrency={vaultFormatters.currency}
            />
        </div>

        <!-- Unidentified expenses — bank-notification placeholders awaiting details -->
        {#if currentUserId}
            <UnidentifiedCard
                {vaultId}
                members={vaultMembersList}
                {currentUserId}
                formatCurrency={vaultFormatters.currency}
                {hasSharedMembers}
            />
        {/if}

        <!-- Recurring commitments — locked-in money + upcoming preview (conditional) -->
        <div class="mb-3">
            <RecurringCommitmentsCard
                {vaultId}
                rules={recurringRules}
                upcoming={upcomingRecurring}
                loading={isLoadingRecurring}
                formatCurrency={vaultFormatters.currency}
            />
        </div>

        <!-- Funds section -->
        {#if fundsResource.loading}
            <div class="mt-4 h-24 rounded-lg border bg-card animate-pulse"></div>
        {:else if fundRows.length > 0}
            <div class="mt-4">
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-sm font-semibold text-muted-foreground">Funds</h2>
                    <button
                        onclick={() => goto(`/vaults/${vaultId}/funds`)}
                        class="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                        Manage →
                    </button>
                </div>
                <div class="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
                    {#each fundRows as row (row.fund.id)}
                        {@const opening = row.activeCycle?.openingBalance ?? 0}
                        {@const topUp = row.activeCycle?.topUpAmount ?? 0}
                        {@const spent = (row.activeCycle?.totalSpent ?? 0)
                            + (row.activeCycle?.totalDeducted ?? 0)
                            - (row.activeCycle?.totalReimbursed ?? 0)}
                        {@const budget = opening + topUp}
                        {@const pct = budget > 0 ? Math.min(1, Math.max(0, spent / budget)) : null}
                        {@const isManual = budget === 0}
                        {@const isLow = topUp > 0 && row.fund.balance / topUp < 0.2}
                        {@const isSelected = selectedFundId === row.fund.id}
                        {@const pctColor = pct == null
                            ? 'var(--primary)'
                            : pct >= 1
                            ? 'var(--amount-negative)'
                            : pct >= 0.9
                            ? 'var(--accent-strong)'
                            : 'var(--primary)'}
                        <button
                            onclick={() => toggleFundFilter(row.fund.id)}
                            class="shrink-0 snap-start w-44 sm:w-56 text-left"
                        >
                            <Card class="h-full transition-all {isSelected ? 'ring-2 ring-primary ring-offset-2 bg-primary/5 shadow-md' : 'hover:shadow-md'} {isLow && !isSelected ? 'border-amber-400/60' : ''}"
                                  style={row.fund.color ? `border-left: 3px solid ${row.fund.color}` : ''}>
                                <CardContent class="p-3 space-y-2">
                                    <!-- Name row -->
                                    <div class="flex items-center justify-between gap-2 min-w-0">
                                        <div class="flex items-center gap-1.5 min-w-0 flex-1">
                                            {#if row.fund.icon}
                                                <span class="text-base shrink-0">{row.fund.icon}</span>
                                            {/if}
                                            <span class="text-sm font-semibold truncate" title={row.fund.name}>{row.fund.name}</span>
                                        </div>
                                        <button
                                            onclick={(e) => { e.stopPropagation(); goto(`/vaults/${vaultId}/funds/${row.fund.id}`); }}
                                            class="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                            title="Open fund"
                                            aria-label="Open fund"
                                        >
                                            <ExternalLink class="size-3.5" />
                                        </button>
                                    </div>

                                    <!-- Balance -->
                                    <p class="font-mono text-lg font-bold tabular-nums leading-none {isLow ? 'text-amber-500' : ''}">
                                        {vaultFormatters.currency(row.fund.balance)}
                                    </p>

                                    {#if pct != null}
                                        <!-- Progress bar + caption -->
                                        <div>
                                            <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    class="h-full rounded-full transition-all"
                                                    style="width: {(pct * 100).toFixed(1)}%; background: {pctColor};"
                                                ></div>
                                            </div>
                                            <p class="text-[11px] text-muted-foreground mt-1 tabular-nums">
                                                {(pct * 100).toFixed(0)}% of {vaultFormatters.currency(budget)}
                                            </p>
                                        </div>
                                    {:else if isManual}
                                        <p class="text-[11px] text-muted-foreground">Manual fund</p>
                                    {/if}
                                </CardContent>
                            </Card>
                        </button>
                    {/each}
                </div>
            </div>
        {:else if !fundsResource.error}
            <div class="mt-4">
                <button
                    class="w-full text-left"
                    onclick={() => goto(`/vaults/${vaultId}/funds`)}
                >
                    <div class="flex items-center justify-between rounded-lg border border-dashed bg-card px-4 py-3 hover:shadow-sm transition-shadow">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">💰</span>
                            <span class="text-sm text-muted-foreground">No funds yet — create one to track a money pool</span>
                        </div>
                        <span class="text-muted-foreground text-sm shrink-0">→</span>
                    </div>
                </button>
            </div>
        {/if}

        <!-- Category breakdown — top 5 categories for the current period -->
        <div class="mt-6">
            <CategoryBreakdownCard
                {vaultId}
                categories={statistics?.byCategory ?? []}
                loading={isLoadingStats}
                formatCurrency={vaultFormatters.currency}
                currentSearch={page.url.search}
            />
        </div>

        <!-- Recent activity -->
        <div class="mt-6">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3 min-w-0">
                    <h2 class="text-sm font-semibold text-muted-foreground">Recent activity</h2>
                    {#if statistics}
                        <span class="text-xs text-muted-foreground whitespace-nowrap">
                            · {statistics.total.count} · <span class="font-mono">{vaultFormatters.currency(statistics.total.amount)}</span>
                        </span>
                    {/if}
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onclick={toggleGroupByDay}
                        aria-pressed={groupByDay}
                        title={groupByDay ? 'Turn off day grouping' : 'Group by day'}
                        class="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-xs {groupByDay ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}"
                    >
                        <CalendarDays class="size-3" />
                        <span class="hidden sm:inline">Group by day</span>
                    </button>
                    <a
                        href="/vaults/{vaultId}/expenses{page.url.search}"
                        class="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
                    >
                        View all
                        <ArrowRight class="size-3" />
                    </a>
                </div>
            </div>

            {#if selectedFundId}
                {@const selectedFund = fundRows.find(r => r.fund.id === selectedFundId)}
                <div class="flex items-center gap-2 mb-2 px-1">
                    <span class="text-xs text-muted-foreground">Filtering by fund:</span>
                    <span class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {#if selectedFund?.fund.icon}{selectedFund.fund.icon}{/if}
                        {selectedFund?.fund.name ?? selectedFundId}
                        <button onclick={() => { params.fundId = ''; }} class="ml-1 hover:text-primary/70" aria-label="Clear fund filter">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </span>
                </div>
            {/if}

            {#if isLoadingExpenses}
                <div class="flex justify-center py-12">
                    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
            {:else if expenses.length === 0}
                <div class="rounded-[var(--radius-md)] border bg-card">
                    <EmptyState
                        icon={Receipt}
                        title="No expenses in this range"
                        description={filterType && filterType !== 'all'
                            ? 'Widen the range or add one to get started.'
                            : 'Add your first expense to get started.'}
                    >
                        {#snippet secondary()}
                            {#if filterType && filterType !== 'all'}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onclick={() => (params.filter = 'all')}
                                >
                                    <Globe class="size-4" />
                                    Show all time
                                </Button>
                            {/if}
                        {/snippet}
                        {#snippet primary()}
                            <Button size="sm" onclick={handleCreateExpense}>
                                <Plus class="size-4" />
                                Add expense
                            </Button>
                        {/snippet}
                    </EmptyState>
                </div>
            {:else}
                <RecentExpenses
                    expenses={expenses}
                    limit={10}
                    grouped={groupByDay}
                    onSelect={(e) => handleEditExpense(e.id)}
                    onDelete={(e) => handleDeleteExpense(e.id)}
                    formatCurrency={vaultFormatters.currency}
                    formatDate={vaultFormatters.date}
                />
                {#if expenses.length > 10}
                    <div class="mt-3 text-center">
                        <a
                            href="/vaults/{vaultId}/expenses{page.url.search}"
                            class="text-sm font-medium text-primary hover:underline"
                        >
                            View all {statistics?.total.count ?? expenses.length} expenses →
                        </a>
                    </div>
                {/if}
            {/if}
        </div>

    {/if}
</div>

<Toaster />