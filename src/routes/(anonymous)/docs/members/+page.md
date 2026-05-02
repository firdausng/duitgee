---
title: Members & Invitations
description: Add the people who share money with you — invite by email, assign a role, and manage active members.
---

<svelte:head>

<title>Members & Invitations — DuitGee Docs</title>
<meta name="description" content="Add the people who share money with you — invite by email, assign a role, and manage active members." />

</svelte:head>

# Members & Invitations

Vaults are built for shared money. Inviting members is the first thing most households do after creating a vault.

## Inviting someone

From the vault, open **Members** → **Invite**:

1. Enter their **email**.
2. Pick a **role**: Owner, Admin, or Member. See [Roles & permissions](/docs/permissions) for what each can do.
3. Send.

They get an email with a link. When they accept, they appear as an active member.

If the invitee doesn't have an account yet, they'll be prompted to create one (or sign in anonymously) — the invitation waits.

## Managing members

The members list shows everyone who's been invited or accepted, with their status and role.

- **Pending** — invitation sent, not yet accepted. You can resend or revoke.
- **Active** — the member can use the vault per their role.
- **Removed** — the member's access was revoked. Their historical expenses stay (audit-preserved); they just can't see or add new ones.

You can change a member's role at any time. The change takes effect immediately.

## What members see

Every active member sees every expense in the vault, regardless of who paid. There is no per-member visibility filter — sharing is the point.

## Anonymous start

You can use DuitGee without creating an account. When you eventually register, everything you logged anonymously moves to your new account. This includes vault membership and any expenses you created. See [Settings](/docs/settings) for the link flow.

## Permissions

- **Invite, change roles, remove**: Owner or Admin (`canManageMembers`).
- **Leave the vault**: any member.

## Related

- [Roles & permissions](/docs/permissions) — what each role can do.
- [Notifications](/docs/notifications) — how the vault stays in sync.
- [Unidentified expenses](/docs/unidentified-expenses) — the workflow built for households where someone sees a charge before the spender logs it.
