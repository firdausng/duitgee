<script lang="ts">
    import { goto, invalidateAll } from '$app/navigation';
    import { ofetch } from 'ofetch';
    import { Button } from '$lib/components/ui/button';
    import { Separator } from '$lib/components/ui/separator';
    import { toast } from 'svelte-sonner';
    import { Toaster } from '$lib/components/ui/sonner';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
    import InviteForm from '../InviteForm.svelte';
    import type { VaultRole } from '$lib/server/utils/vaultPermissions';
    import Users from '@lucide/svelte/icons/users';
    import UserPlus from '@lucide/svelte/icons/user-plus';
    import Mail from '@lucide/svelte/icons/mail';
    import MoreVertical from '@lucide/svelte/icons/more-vertical';
    import ArrowUp from '@lucide/svelte/icons/arrow-up';
    import ArrowDown from '@lucide/svelte/icons/arrow-down';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import LogOut from '@lucide/svelte/icons/log-out';
    import Crown from '@lucide/svelte/icons/crown';
    import { cn } from '$lib/utils';

    let { data } = $props();

    interface Member {
        userId: string;
        displayName: string;
        role: VaultRole;
        joinedAt: string | null;
        image?: string | null;
    }

    interface PendingInvitation {
        id: string;
        role: string | null;
        inviteeId: string | null;
        inviteeEmail: string | null;
        inviteeName: string | null;
        invitedAt: string | null;
    }

    // Per-row avatar load failure tracking — one broken image doesn't break others.
    let imageFailed = $state<Record<string, boolean>>({});

    let members = $state<Member[]>(data.members || []);
    let pendingInvitations = $state<PendingInvitation[]>(data.pendingInvitations || []);
    let isProcessing = $state<string | null>(null);

    // Invite form state
    let showInviteForm = $state(false);
    let inviteEmail = $state('');
    let inviteRole = $state<'admin' | 'member'>('member');
    let isInviting = $state(false);

    // --- Role grouping (owner pinned, admins, members) ---
    const owner = $derived(members.find((m) => m.role === 'owner') ?? null);
    const admins = $derived(members.filter((m) => m.role === 'admin'));
    const regularMembers = $derived(members.filter((m) => m.role === 'member'));

    // --- Permissions ---
    function canManageMember(memberRole: VaultRole): boolean {
        if (!data.permissions.canManageMembers) return false;
        if (data.userRole === 'owner') return true;
        if (data.userRole === 'admin' && memberRole === 'member') return true;
        return false;
    }

    // --- Time formatting ---
    function relativeTime(dateString: string | null): string {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (days < 1) return 'today';
        if (days === 1) return 'yesterday';
        if (days < 7) return `${days}d ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 5) return `${weeks}w ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;
        const years = Math.floor(days / 365);
        return `${years}y ago`;
    }
    function fullDate(dateString: string | null): string {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    // --- Role badge styling — filled chips ---
    function roleBadge(role: VaultRole | string | null): string {
        switch (role) {
            case 'owner':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300';
            case 'admin':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300';
            case 'member':
            default:
                return 'bg-muted text-muted-foreground';
        }
    }

    // --- Member actions ---
    async function handleRemoveMember(userId: string, displayName: string) {
        if (!confirm(`Remove ${displayName} from this vault?`)) return;
        isProcessing = userId;
        try {
            const response = await ofetch('/api/removeMember', {
                method: 'POST',
                body: { vaultId: data.vaultId, userId },
            });
            if (response.success) {
                toast.success(`${displayName} removed`);
                members = members.filter((m) => m.userId !== userId);
            } else {
                toast.error(response.error || 'Failed to remove member');
            }
        } catch {
            toast.error('Failed to remove member');
        } finally {
            isProcessing = null;
        }
    }

    async function handleUpdateRole(
        userId: string,
        displayName: string,
        currentRole: VaultRole,
        newRole: VaultRole,
    ) {
        if (currentRole === newRole) return;
        const action = newRole === 'admin' ? 'Promote' : 'Demote';
        if (!confirm(`${action} ${displayName} to ${newRole}?`)) return;
        isProcessing = userId;
        try {
            const response = await ofetch('/api/updateMemberRole', {
                method: 'POST',
                body: { vaultId: data.vaultId, userId, role: newRole },
            });
            if (response.success) {
                toast.success(`${displayName} is now ${newRole}`);
                members = members.map((m) => (m.userId === userId ? { ...m, role: newRole } : m));
            } else {
                toast.error(response.error || 'Failed to update role');
            }
        } catch {
            toast.error('Failed to update role');
        } finally {
            isProcessing = null;
        }
    }

    async function handleLeaveVault() {
        if (data.userRole === 'owner') {
            toast.error('Vault owner cannot leave. Transfer ownership or delete the vault instead.');
            return;
        }
        if (!confirm('Leave this vault?')) return;
        isProcessing = 'leaving';
        try {
            const response = await ofetch('/api/leaveVault', {
                method: 'POST',
                body: { vaultId: data.vaultId },
            });
            if (response.success) {
                toast.success('You have left the vault');
                setTimeout(() => goto('/vaults'), 800);
            } else {
                toast.error(response.error || 'Failed to leave vault');
            }
        } catch {
            toast.error('Failed to leave vault');
        } finally {
            isProcessing = null;
        }
    }

    // --- Invite ---
    function toggleInviteForm() {
        showInviteForm = !showInviteForm;
        if (!showInviteForm) {
            inviteEmail = '';
            inviteRole = 'member';
        }
    }

    async function handleInviteUser() {
        if (!inviteEmail.trim()) {
            toast.error('Please enter an email address');
            return;
        }
        isInviting = true;
        try {
            const response = await ofetch('/api/createInvitation', {
                method: 'POST',
                body: {
                    vaultId: data.vaultId,
                    inviteeEmail: inviteEmail.trim(),
                    role: inviteRole,
                },
            });
            if (response.success) {
                toast.success(`Invitation sent to ${inviteEmail}`);
                inviteEmail = '';
                inviteRole = 'member';
                showInviteForm = false;
                // Refresh server data so the new pending invitation shows up.
                await invalidateAll();
                pendingInvitations = data.pendingInvitations || [];
            } else {
                throw new Error(response.error || 'Failed to send invitation');
            }
        } catch (error: any) {
            const errorMessage = error?.data?.error || error?.message || 'Failed to send invitation. Please try again.';
            toast.error(errorMessage);
        } finally {
            isInviting = false;
        }
    }

    // --- Pending invitation actions ---
    async function handleRevokeInvitation(invitationId: string, label: string) {
        if (!confirm(`Cancel invitation to ${label}?`)) return;
        isProcessing = invitationId;
        try {
            const response = await ofetch('/api/revokeInvitation', {
                method: 'POST',
                body: { invitationId, vaultId: data.vaultId },
            });
            if (response.success) {
                toast.success('Invitation cancelled');
                pendingInvitations = pendingInvitations.filter((p) => p.id !== invitationId);
            } else {
                toast.error(response.error || 'Failed to cancel invitation');
            }
        } catch (error: any) {
            toast.error(error?.data?.error || 'Failed to cancel invitation');
        } finally {
            isProcessing = null;
        }
    }

    // Empty-state trigger: the user is alone AND no pending invites.
    const showEmptyState = $derived(members.length <= 1 && pendingInvitations.length === 0);
</script>

<Toaster />

<div class="container mx-auto py-4 sm:py-8 px-4 max-w-3xl">
    <!-- Mobile-only header (desktop has DesktopAppBar with vault name + invite icon) -->
    <div class="md:hidden mb-4">
        <h1 class="text-xl font-bold">Members</h1>
        <p class="text-muted-foreground text-sm mt-0.5">
            Manage who has access to this vault.
        </p>
        <div class="flex flex-col gap-2 mt-3">
            {#if data.permissions.canManageMembers}
                <Button onclick={toggleInviteForm} class="w-full">
                    <UserPlus class="size-4" />
                    Invite member
                </Button>
            {/if}
            {#if data.userRole !== 'owner'}
                <Button
                    variant="destructive"
                    onclick={handleLeaveVault}
                    disabled={isProcessing === 'leaving'}
                    class="w-full"
                >
                    <LogOut class="size-4" />
                    {isProcessing === 'leaving' ? 'Leaving...' : 'Leave vault'}
                </Button>
            {/if}
        </div>
    </div>

    <!-- Desktop: action row above the list (no title — header covers it) -->
    <div class="hidden md:flex items-center justify-between mb-4">
        <p class="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? 'member' : 'members'}{#if pendingInvitations.length > 0}
                · {pendingInvitations.length} pending
            {/if}
        </p>
        <div class="flex items-center gap-2">
            {#if data.permissions.canManageMembers}
                <Button onclick={toggleInviteForm} size="sm">
                    <UserPlus class="size-4" />
                    Invite member
                </Button>
            {/if}
            {#if data.userRole !== 'owner'}
                <Button
                    variant="outline"
                    size="sm"
                    onclick={handleLeaveVault}
                    disabled={isProcessing === 'leaving'}
                >
                    <LogOut class="size-4" />
                    {isProcessing === 'leaving' ? 'Leaving...' : 'Leave vault'}
                </Button>
            {/if}
        </div>
    </div>

    {#if showInviteForm}
        <div class="mb-4">
            <InviteForm
                show={showInviteForm}
                email={inviteEmail}
                role={inviteRole}
                {isInviting}
                onEmailChange={(value) => (inviteEmail = value)}
                onRoleChange={(role) => (inviteRole = role)}
                onSubmit={handleInviteUser}
                onCancel={toggleInviteForm}
            />
        </div>
    {/if}

    {#snippet roleBadgeChip(role: VaultRole | string)}
        <span class={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide', roleBadge(role))}>
            {role}
        </span>
    {/snippet}

    {#snippet memberAvatar(member: Member)}
        {#if member.image && !imageFailed[member.userId]}
            <img
                src={member.image}
                alt=""
                referrerpolicy="no-referrer"
                onerror={() => (imageFailed = { ...imageFailed, [member.userId]: true })}
                class="size-9 rounded-full object-cover bg-muted shrink-0"
            />
        {:else}
            <div class="size-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                {member.displayName.charAt(0).toUpperCase()}
            </div>
        {/if}
    {/snippet}

    {#snippet memberRow(member: Member, opts?: { hideActions?: boolean })}
        {@const isCurrentUser = member.userId === data.currentMembership?.userId}
        {@const canManage = !opts?.hideActions && canManageMember(member.role) && !isCurrentUser}
        {@const isBeingProcessed = isProcessing === member.userId}
        {@const canPromote = canManage && member.role === 'member' && data.userRole === 'owner'}
        {@const canDemote = canManage && member.role === 'admin' && data.userRole === 'owner'}
        {@const canRemove = canManage && member.role !== 'owner'}
        {@const hasAnyAction = canPromote || canDemote || canRemove}

        <div class="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
            {@render memberAvatar(member)}
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium text-sm truncate">{member.displayName}</span>
                    {#if isCurrentUser}
                        <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">You</span>
                    {/if}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                    {@render roleBadgeChip(member.role)}
                    {#if member.joinedAt}
                        <span class="text-xs text-muted-foreground" title={fullDate(member.joinedAt)}>
                            joined {relativeTime(member.joinedAt)}
                        </span>
                    {/if}
                </div>
            </div>

            {#if hasAnyAction}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        disabled={isBeingProcessed}
                        class="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
                        aria-label={`Actions for ${member.displayName}`}
                    >
                        <MoreVertical class="size-4" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" class="min-w-[12rem]">
                        {#if canPromote}
                            <DropdownMenu.Item onclick={() => handleUpdateRole(member.userId, member.displayName, member.role, 'admin')}>
                                <ArrowUp class="size-4" />
                                <span>Promote to admin</span>
                            </DropdownMenu.Item>
                        {/if}
                        {#if canDemote}
                            <DropdownMenu.Item onclick={() => handleUpdateRole(member.userId, member.displayName, member.role, 'member')}>
                                <ArrowDown class="size-4" />
                                <span>Demote to member</span>
                            </DropdownMenu.Item>
                        {/if}
                        {#if canRemove}
                            {#if canPromote || canDemote}
                                <DropdownMenu.Separator />
                            {/if}
                            <DropdownMenu.Item destructive onclick={() => handleRemoveMember(member.userId, member.displayName)}>
                                <Trash2 class="size-4" />
                                <span>Remove from vault</span>
                            </DropdownMenu.Item>
                        {/if}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            {/if}
        </div>
    {/snippet}

    {#snippet sectionHeader(label: string, count?: number)}
        <div class="flex items-center gap-2 px-1 mb-1.5 mt-4 first:mt-0">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
            {#if count !== undefined && count > 0}
                <span class="text-xs text-muted-foreground">· {count}</span>
            {/if}
        </div>
    {/snippet}

    {#if showEmptyState}
        <!-- Empty state — owner is the only member, no pending invites -->
        <div class="border rounded-[var(--radius-md)] bg-card flex flex-col items-center justify-center text-center py-12 px-4">
            <div class="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users class="size-6 text-muted-foreground" />
            </div>
            <h2 class="font-semibold text-base mb-1">Just you in this vault</h2>
            <p class="text-sm text-muted-foreground max-w-sm mb-4">
                Invite teammates or family to share expenses, track joint spending, and split costs.
            </p>
            {#if data.permissions.canManageMembers}
                <Button onclick={toggleInviteForm} size="sm">
                    <UserPlus class="size-4" />
                    Invite the first member
                </Button>
            {/if}
        </div>
    {:else}
        {#if owner}
            {@render sectionHeader('Owner')}
            <div class="border rounded-[var(--radius-md)] bg-card overflow-hidden">
                {@render memberRow(owner, { hideActions: true })}
            </div>
        {/if}

        {#if admins.length > 0}
            {@render sectionHeader('Admins', admins.length)}
            <div class="border rounded-[var(--radius-md)] bg-card divide-y divide-border overflow-hidden">
                {#each admins as member (member.userId)}
                    {@render memberRow(member)}
                {/each}
            </div>
        {/if}

        {#if regularMembers.length > 0}
            {@render sectionHeader('Members', regularMembers.length)}
            <div class="border rounded-[var(--radius-md)] bg-card divide-y divide-border overflow-hidden">
                {#each regularMembers as member (member.userId)}
                    {@render memberRow(member)}
                {/each}
            </div>
        {/if}

        {#if pendingInvitations.length > 0}
            {@render sectionHeader('Pending invitations', pendingInvitations.length)}
            <div class="border rounded-[var(--radius-md)] bg-card divide-y divide-border overflow-hidden">
                {#each pendingInvitations as inv (inv.id)}
                    {@const label = inv.inviteeName || inv.inviteeEmail || 'Unknown invitee'}
                    {@const isBeingProcessed = isProcessing === inv.id}
                    <div class="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                        <div class="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Mail class="size-4 text-muted-foreground" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-medium text-sm truncate">{label}</span>
                            </div>
                            <div class="flex items-center gap-2 mt-0.5">
                                {#if inv.role}
                                    {@render roleBadgeChip(inv.role)}
                                {/if}
                                <span class="text-xs text-muted-foreground" title={fullDate(inv.invitedAt)}>
                                    invited {relativeTime(inv.invitedAt)}
                                </span>
                            </div>
                        </div>
                        {#if data.permissions.canManageMembers}
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger
                                    disabled={isBeingProcessed}
                                    class="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
                                    aria-label={`Actions for invitation to ${label}`}
                                >
                                    <MoreVertical class="size-4" />
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content align="end" class="min-w-[12rem]">
                                    <DropdownMenu.Item destructive onclick={() => handleRevokeInvitation(inv.id, label)}>
                                        <Trash2 class="size-4" />
                                        <span>Cancel invitation</span>
                                    </DropdownMenu.Item>
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    {/if}

    <Separator class="my-6" />

    <!-- Permission reference (collapsed by default — keeps the live list as the focus) -->
    <details class="group">
        <summary class="cursor-pointer flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors select-none">
            <span class="inline-block transition-transform group-open:rotate-90">▸</span>
            <span>What can each role do?</span>
        </summary>
        <div class="mt-3 border rounded-[var(--radius-md)] bg-card overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead>
                    <tr class="border-b text-xs text-muted-foreground uppercase tracking-wide">
                        <th class="text-left py-2 px-3 font-medium">Permission</th>
                        <th class="text-center py-2 px-3 font-medium">
                            <span class="inline-flex items-center gap-1 justify-center">
                                <Crown class="size-3" /> Owner
                            </span>
                        </th>
                        <th class="text-center py-2 px-3 font-medium">Admin</th>
                        <th class="text-center py-2 px-3 font-medium">Member</th>
                    </tr>
                </thead>
                <tbody class="text-sm">
                    {#each [
                        { label: 'Create expenses', owner: true, admin: true, member: true },
                        { label: 'Edit expenses', owner: true, admin: true, member: false },
                        { label: 'Delete expenses', owner: true, admin: true, member: false },
                        { label: 'Manage members', owner: true, admin: true, member: false },
                        { label: 'Edit vault', owner: true, admin: true, member: false },
                        { label: 'Delete vault', owner: true, admin: false, member: false },
                    ] as row (row.label)}
                        <tr class="border-b last:border-b-0">
                            <td class="py-2 px-3">{row.label}</td>
                            <td class="text-center py-2 px-3">{row.owner ? '✓' : '—'}</td>
                            <td class="text-center py-2 px-3">{row.admin ? '✓' : '—'}</td>
                            <td class="text-center py-2 px-3">{row.member ? '✓' : '—'}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </details>
</div>
