---
title: Notifications
description: How DuitGee keeps everyone in the vault on the same page — in-app, best-effort, vault-scoped.
---

<svelte:head>

<title>Notifications — DuitGee Docs</title>
<meta name="description" content="How DuitGee keeps everyone in the vault on the same page — in-app, best-effort, vault-scoped." />

</svelte:head>

# Notifications

Notifications keep the vault in sync without anyone having to ask *"did you log that yet?"* They're the structural answer to one of the household-money frictions DuitGee was built around.

## Where they live

The bell icon in the app header. Unread count is per-user-per-vault. Click an item to open the related expense or fund.

## What you'll see

Currently emitted events:

- **Unidentified expense created** — fans out to every other vault member when someone quick-logs a charge whose details they don't fully know yet. See [Unidentified expenses](/docs/unidentified-expenses).
- **Unidentified expense claimed** — direct to the original creator when someone else claims their unidentified entry.

More events are planned:

- Recurring occurrence pending approval.
- Statistics anomaly detected (a charge that's significantly larger than the category baseline).
- Fund balance dropped below a threshold.
- Reimbursement awaiting settlement.

## How they work

- **In-app only** in v1. No email, no push, no SMS. The storage shape is forward-compatible — channels can be added later without migration.
- **Vault-scoped** — you only see notifications from vaults you're an active member of.
- **Best-effort** — if a notification fails to send, the underlying action (the expense, the claim, the recurring approval) still succeeds. A flaky notification system must never roll back real records.
- **Excludes the actor** — you don't get notified about your own actions.

## Permissions

Every active vault member gets vault-wide notifications by default. There's currently no per-member opt-out — if you want to mute a vault, leave it.

## Related

- [Unidentified expenses](/docs/unidentified-expenses) — the workflow notifications were built around.
- [Members & invitations](/docs/members) — notifications are scoped to active membership.
