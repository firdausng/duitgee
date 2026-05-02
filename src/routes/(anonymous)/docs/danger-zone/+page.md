---
title: Danger Zone
description: Vault deletion, account deletion, and other irreversible operations — what happens, what's preserved, and what's gone.
---

<svelte:head>

<title>Danger Zone — DuitGee Docs</title>
<meta name="description" content="Vault deletion, account deletion, and other irreversible operations — what happens, what's preserved, and what's gone." />

</svelte:head>

# Danger Zone

The irreversible operations. Read before clicking.

## Deleting a vault

Only the **Owner** can delete a vault. Admins and Members can't.

What happens:

- The vault is **soft-deleted**. Members lose access immediately.
- Expenses, funds, recurring rules, templates, tags, and attachments are all marked deleted.
- Audit fields are preserved — the records exist in the database for audit and recovery, but no UI surface shows them.
- Active recurring rules stop generating immediately.

Restoration is possible but is a manual operation today — open a support ticket via [Support](/docs/support) if you delete by mistake. Don't rely on this; treat the action as final.

## Leaving a vault

Any member can leave a vault. What happens:

- Your membership is removed.
- Your historical expenses **stay in the vault** under the audit trail. The remaining members keep their full history; you just stop seeing the vault.
- If you were the only Owner, you can't leave until you transfer ownership or delete the vault. The vault must always have at least one Owner.

## Removing a member

Owners and Admins can remove members. Removed members lose access immediately. Their historical expenses stay (audit-preserved). The action is reversible by re-inviting them.

## Deleting your account

From **/settings/danger** you can request account deletion. What happens:

- All vaults you **own** are soft-deleted.
- Your membership in vaults **owned by others** is removed; their historical records of you remain audit-preserved.
- Your auth record is removed.

This is irreversible. If you're unsure, delete vaults individually first.

## What soft-delete actually means

DuitGee uses soft-deletion across the board:

- Records get a `deletedAt` timestamp and a `deletedBy` user ID.
- They're filtered out of every read query.
- They stop showing up everywhere — UI, exports, statistics, search.
- They survive in the database for support and accidental-recovery cases.

Treat the action as final. The recovery path is manual and not guaranteed.

## Related

- [Members & invitations](/docs/members) — removing and re-inviting members.
- [Settings](/docs/settings) — where the danger zone lives.
- [Support](/docs/support) — recovery requests.
