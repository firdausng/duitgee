<script lang="ts">
    import {goto} from "$app/navigation";
    import {ofetch} from "ofetch";
    import { Button } from "$lib/components/ui/button";
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
    import { Separator } from "$lib/components/ui/separator";
    import { toast } from "svelte-sonner";
    import { Toaster } from "$lib/components/ui/sonner";
    import InviteForm from "../InviteForm.svelte";
    import type {VaultRole} from "$lib/server/utils/vaultPermissions";

    let { data } = $props();

    interface Member {
        userId: string;
        displayName: string;
        role: VaultRole;
        joinedAt: string | null;
    }

    let members = $state<Member[]>(data.members || []);
    let isProcessing = $state<string | null>(null); // Track which member is being processed

    // Invite form state
    let showInviteForm = $state(false);
    let inviteEmail = $state('');
    let inviteRole = $state<'admin' | 'member'>('member');
    let isInviting = $state(false);

    // Helper to get role badge color
    function getRoleBadgeClass(role: VaultRole): string {
        switch (role) {
            case 'owner':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'admin':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'member':
                return 'bg-gray-100 text-gray-800 border-gray-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    }

    // Helper to format date
    function formatDate(dateString: string | null): string {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Check if current user can manage a specific member
    function canManageMember(memberRole: VaultRole): boolean {
        if (!data.permissions.canManageMembers) return false;

        // Owner can manage everyone except themselves
        if (data.userRole === 'owner') return true;

        // Admin can only manage regular members (not owner or other admins)
        if (data.userRole === 'admin' && memberRole === 'member') return true;

        return false;
    }

    // Check if current user can change a member's role
    function canChangeRole(memberRole: VaultRole, newRole: VaultRole): boolean {
        if (!data.permissions.canManageMembers) return false;

        // Only owner can promote to admin or demote admin
        if (memberRole === 'admin' || newRole === 'admin') {
            return data.userRole === 'owner';
        }

        return true;
    }

    // Remove member
    async function handleRemoveMember(userId: string, displayName: string) {
        if (!confirm(`Are you sure you want to remove ${displayName} from this vault?`)) {
            return;
        }

        isProcessing = userId;

        try {
            const response = await ofetch('/api/removeMember', {
                method: 'POST',
                body: {
                    vaultId: data.vaultId,
                    userId
                }
            });

            if (response.success) {
                toast.success(`${displayName} has been removed from the vault`);
                // Remove member from local state
                members = members.filter(m => m.userId !== userId);
            } else {
                toast.error(response.error || 'Failed to remove member');
            }
        } catch (error) {
            console.error('Error removing member:', error);
            toast.error('Failed to remove member');
        } finally {
            isProcessing = null;
        }
    }

    // Update member role
    async function handleUpdateRole(userId: string, displayName: string, currentRole: VaultRole, newRole: VaultRole) {
        if (currentRole === newRole) return;

        if (!canChangeRole(currentRole, newRole)) {
            toast.error('You do not have permission to change this member\'s role');
            return;
        }

        const action = newRole === 'admin' ? 'promote' : 'demote';
        if (!confirm(`Are you sure you want to ${action} ${displayName} to ${newRole}?`)) {
            return;
        }

        isProcessing = userId;

        try {
            const response = await ofetch('/api/updateMemberRole', {
                method: 'POST',
                body: {
                    vaultId: data.vaultId,
                    userId,
                    role: newRole
                }
            });

            if (response.success) {
                toast.success(`${displayName} has been ${action}d to ${newRole}`);
                // Update member role in local state
                members = members.map(m =>
                    m.userId === userId ? { ...m, role: newRole } : m
                );
            } else {
                toast.error(response.error || 'Failed to update member role');
            }
        } catch (error) {
            console.error('Error updating member role:', error);
            toast.error('Failed to update member role');
        } finally {
            isProcessing = null;
        }
    }

    // Leave vault
    async function handleLeaveVault() {
        if (data.userRole === 'owner') {
            toast.error('Vault owner cannot leave. Transfer ownership or delete the vault instead.');
            return;
        }

        if (!confirm('Are you sure you want to leave this vault?')) {
            return;
        }

        isProcessing = 'leaving';

        try {
            const response = await ofetch('/api/leaveVault', {
                method: 'POST',
                body: {
                    vaultId: data.vaultId
                }
            });

            if (response.success) {
                toast.success('You have left the vault');
                // Redirect to vaults list
                setTimeout(() => {
                    goto('/vaults');
                }, 1000);
            } else {
                toast.error(response.error || 'Failed to leave vault');
            }
        } catch (error) {
            console.error('Error leaving vault:', error);
            toast.error('Failed to leave vault');
        } finally {
            isProcessing = null;
        }
    }

    // Toggle invite form
    function toggleInviteForm() {
        showInviteForm = !showInviteForm;
        if (!showInviteForm) {
            // Reset form when closing
            inviteEmail = '';
            inviteRole = 'member';
        }
    }

    // Invite user handler
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
                    role: inviteRole
                }
            });

            if (response.success) {
                toast.success(`Invitation sent to ${inviteEmail}`);
                // Reset form
                inviteEmail = '';
                inviteRole = 'member';
                showInviteForm = false;

                // Note: New member will appear after they accept the invitation
                // For now, we could refresh the page or show a message
            } else {
                throw new Error(response.error || 'Failed to send invitation');
            }
        } catch (error: any) {
            console.error('Failed to invite user:', error);
            const errorMessage = error?.data?.error || error?.message || 'Failed to send invitation. Please try again.';
            toast.error(errorMessage);
        } finally {
            isInviting = false;
        }
    }
</script>

<div class="container mx-auto py-4 sm:py-8 px-4 max-w-6xl">
    <!-- Header -->
    <div class="mb-4 sm:mb-6">
        <div class="flex flex-col gap-4 mb-4">
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold break-words">{data.vault.name} - Members</h1>
                <p class="text-muted-foreground mt-1 text-sm sm:text-base">
                    Manage vault members and their permissions
                </p>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {#if data.permissions.canManageMembers}
                    <Button onclick={toggleInviteForm} class="w-full sm:w-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                        </svg>
                        Invite Members
                    </Button>
                {/if}
                {#if data.userRole !== 'owner'}
                    <Button
                        variant="destructive"
                        onclick={handleLeaveVault}
                        disabled={isProcessing === 'leaving'}
                        class="w-full sm:w-auto"
                    >
                        {isProcessing === 'leaving' ? 'Leaving...' : 'Leave Vault'}
                    </Button>
                {/if}
            </div>
        </div>

        <!-- Current user info -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium">Your role:</span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border {getRoleBadgeClass(data.userRole)}">
                    {data.userRole}
                </span>
            </div>
        </div>
    </div>

    <Separator class="my-4 sm:my-6" />

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

    <!-- Members list -->
    <Card>
        <CardHeader>
            <CardTitle class="text-xl sm:text-2xl">Vault Members ({members.length})</CardTitle>
            <CardDescription class="text-sm">
                All members who have access to this vault
            </CardDescription>
        </CardHeader>
        <CardContent class="px-3 sm:px-6">
            {#if members.length === 0}
                <div class="text-center py-12 text-muted-foreground">
                    <p class="text-sm sm:text-base">No members found</p>
                </div>
            {:else}
                <div class="divide-y">
                    {#each members as member (member.userId)}
                        {@const isCurrentUser = member.userId === data.currentMembership?.userId}
                        {@const isOwner = member.role === 'owner'}
                        {@const canManage = canManageMember(member.role) && !isCurrentUser}
                        {@const isBeingProcessed = isProcessing === member.userId}

                        <div class="py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <!-- Member info -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                                        {member.displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <span class="font-medium text-sm sm:text-base truncate">
                                                {member.displayName}
                                                {#if isCurrentUser}
                                                    <span class="text-xs text-muted-foreground">(You)</span>
                                                {/if}
                                            </span>
                                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border {getRoleBadgeClass(member.role)} flex-shrink-0">
                                                {member.role}
                                            </span>
                                        </div>
                                        <div class="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                            Joined {formatDate(member.joinedAt)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 sm:flex-shrink-0">
                                {#if canManage}
                                    <!-- Role management -->
                                    {#if !isOwner}
                                        {#if member.role === 'member' && data.userRole === 'owner'}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onclick={() => handleUpdateRole(member.userId, member.displayName, member.role, 'admin')}
                                                disabled={isBeingProcessed}
                                                class="w-full sm:w-auto text-xs sm:text-sm whitespace-nowrap"
                                            >
                                                <span class="hidden sm:inline">Promote to Admin</span>
                                                <span class="sm:hidden">Promote</span>
                                            </Button>
                                        {/if}
                                        {#if member.role === 'admin' && data.userRole === 'owner'}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onclick={() => handleUpdateRole(member.userId, member.displayName, member.role, 'member')}
                                                disabled={isBeingProcessed}
                                                class="w-full sm:w-auto text-xs sm:text-sm whitespace-nowrap"
                                            >
                                                <span class="hidden sm:inline">Demote to Member</span>
                                                <span class="sm:hidden">Demote</span>
                                            </Button>
                                        {/if}

                                        <!-- Remove button -->
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onclick={() => handleRemoveMember(member.userId, member.displayName)}
                                            disabled={isBeingProcessed}
                                            class="w-full sm:w-auto text-xs sm:text-sm"
                                        >
                                            {isBeingProcessed ? 'Removing...' : 'Remove'}
                                        </Button>
                                    {/if}
                                {:else if isOwner}
                                    <span class="text-xs sm:text-sm text-muted-foreground px-3 py-2 text-center sm:text-left">
                                        Vault Owner
                                    </span>
                                {:else if isCurrentUser && !isOwner}
                                    <span class="text-xs sm:text-sm text-muted-foreground px-3 py-2 text-center sm:text-left">
                                        Your account
                                    </span>
                                {:else}
                                    <span class="text-xs sm:text-sm text-muted-foreground px-3 py-2 text-center sm:text-left">
                                        No actions
                                    </span>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </CardContent>
    </Card>

    <!-- Permission matrix (informational) -->
    <Card class="mt-4 sm:mt-6">
        <CardHeader>
            <CardTitle class="text-xl sm:text-2xl">Permission Matrix</CardTitle>
            <CardDescription class="text-sm">
                What each role can do in this vault
            </CardDescription>
        </CardHeader>
        <CardContent class="px-3 sm:px-6">
            <div class="overflow-x-auto -mx-3 sm:mx-0">
                <div class="inline-block min-w-full align-middle">
                    <table class="min-w-full text-xs sm:text-sm">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left py-2 px-2 sm:px-4 font-medium whitespace-nowrap">Permission</th>
                                <th class="text-center py-2 px-2 sm:px-4 font-medium whitespace-nowrap">
                                    <span class="hidden sm:inline">Owner</span>
                                    <span class="sm:hidden">Own</span>
                                </th>
                                <th class="text-center py-2 px-2 sm:px-4 font-medium whitespace-nowrap">
                                    <span class="hidden sm:inline">Admin</span>
                                    <span class="sm:hidden">Adm</span>
                                </th>
                                <th class="text-center py-2 px-2 sm:px-4 font-medium whitespace-nowrap">
                                    <span class="hidden sm:inline">Member</span>
                                    <span class="sm:hidden">Mem</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="border-b">
                                <td class="py-2 px-2 sm:px-4 whitespace-nowrap">
                                    <span class="hidden sm:inline">Create Expenses</span>
                                    <span class="sm:hidden">Create</span>
                                </td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                            </tr>
                            <tr class="border-b">
                                <td class="py-2 px-2 sm:px-4 whitespace-nowrap">
                                    <span class="hidden sm:inline">Edit Expenses</span>
                                    <span class="sm:hidden">Edit</span>
                                </td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                                <td class="text-center py-2 px-2 sm:px-4">❌</td>
                            </tr>
                            <tr class="border-b">
                                <td class="py-2 px-2 sm:px-4 whitespace-nowrap">
                                    <span class="hidden sm:inline">Delete Expenses</span>
                                    <span class="sm:hidden">Delete</span>
                                </td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                                <td class="text-center py-2 px-2 sm:px-4">❌</td>
                            </tr>
                            <tr class="border-b">
                                <td class="py-2 px-2 sm:px-4 whitespace-nowrap">
                                    <span class="hidden sm:inline">Manage Members</span>
                                    <span class="sm:hidden">Manage</span>
                                </td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                                <td class="text-center py-2 px-2 sm:px-4">❌</td>
                            </tr>
                            <tr class="border-b">
                                <td class="py-2 px-2 sm:px-4 whitespace-nowrap">
                                    <span class="hidden sm:inline">Edit Vault</span>
                                    <span class="sm:hidden">Edit Vault</span>
                                </td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                                <td class="text-center py-2 px-2 sm:px-4">❌</td>
                            </tr>
                            <tr>
                                <td class="py-2 px-2 sm:px-4 whitespace-nowrap">
                                    <span class="hidden sm:inline">Delete Vault</span>
                                    <span class="sm:hidden">Del Vault</span>
                                </td>
                                <td class="text-center py-2 px-2 sm:px-4">✅</td>
                                <td class="text-center py-2 px-2 sm:px-4">❌</td>
                                <td class="text-center py-2 px-2 sm:px-4">❌</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </CardContent>
    </Card>

    <!-- Help text -->
    <div class="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 class="font-medium mb-2 text-sm sm:text-base">Notes:</h3>
        <ul class="text-xs sm:text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Only the vault owner can promote members to admin or demote admins</li>
            <li>Admins can remove regular members but not other admins or the owner</li>
            <li>The vault owner cannot be removed or leave the vault</li>
            <li>You cannot change your own role or remove yourself (use "Leave Vault" instead)</li>
        </ul>
    </div>
</div>

<Toaster />
