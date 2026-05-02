---
title: Unidentified Expenses
description: Log a charge you can see but can't yet explain — and reconcile it later when the real expense lands.
---

<svelte:head>

<title>Unidentified Expenses — DuitGee Docs</title>
<meta name="description" content="Log a charge you can see but can't yet explain — and reconcile it later when the real expense lands." />

</svelte:head>

# Unidentified Expenses

Multi-member vaults have a timing problem: User A sees a bank notification before User B (the actual spender) logs the expense. The "unidentified" workflow gives a third option besides *guess at details* or *just wait*.

## The flow

1. **Quick log** — anyone in the vault can record amount, date, and (optionally) `paidBy`, and mark it as a placeholder. No category, no note, no payment type required.
2. **Notification fans out** to every other vault member: "There's an unidentified RM 50 charge from yesterday — was this you?"
3. **The real spender claims** — they open the placeholder, fill in the missing details, and save. The status flips from `unidentified` to `confirmed`. The original record is preserved (same `id`, same `createdAt`, same audit trail).

Or — when the spender logs the real expense fresh, DuitGee notices the matching unidentified entry within ±1 day and prompts: *"Claim Sarah's RM 50 from Mar 12?"*

## Never auto-merge

DuitGee never silently merges. The user explicitly claims because *magical when right is painful when wrong*, and the friction we're trying to remove is interpersonal — silently merging your spouse's gas station charge with your grocery run would be the bad version of "smart."

## Where you'll see them

- **Dashboard widget** — only renders when there are unidentified expenses or the vault has shared members. Shows the three newest, with a quick-log modal for two-tap creation.
- **Inline badge** — an amber pill with a `?` icon next to unidentified rows in the expense list.
- **Notification bell** — unread fan-out notifications.
- **Statistics** — unidentified expenses appear under a system "Unidentified" category in breakdowns until claimed, so they don't poison your real categories.

## Solo users

If you're using DuitGee alone, the workflow still works — you become both the logger and the claimer. You see a charge on your bank app, quick-log it, and reconcile when you're back at your desk and remember what it was.

## Plan tier

Free for everyone. This is a workflow feature, not a scaled / advanced one.

## Related

- [Expenses](/docs/expenses) — the duplicate-detection prompt fires from the create flow.
- [Notifications](/docs/notifications) — fan-out events.
- [Members & invitations](/docs/members) — what makes the workflow more useful.
