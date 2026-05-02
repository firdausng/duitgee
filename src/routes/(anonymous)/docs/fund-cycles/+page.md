---
title: Fund Cycles
description: Close a fund's period, capture the closing balance, and start a fresh cycle — without losing the history.
---

<svelte:head>

<title>Fund Cycles — DuitGee Docs</title>
<meta name="description" content="Close a fund's period, capture the closing balance, and start a fresh cycle — without losing the history." />

</svelte:head>

# Fund Cycles

A cycle is a period of activity for a fund. Cycles let you close out a month, capture how much was spent, and start fresh — without losing the history of what happened before.

## When to use a cycle

- **Monthly allowance** — the kid's allowance fund resets the 1st of every month.
- **Trip pool** — close the cycle when the trip ends; if a future trip uses the same fund, the next cycle starts clean.
- **Household card** — capture each month's spend and close, so monthly comparisons are clean.

You don't have to use cycles. A fund without explicit cycles just runs continuously.

## Closing a cycle

From the fund detail page, hit **Close cycle**. DuitGee:

1. Records the closing balance and the period's totals.
2. Archives every entry in that cycle (top-ups, deductions, reimbursements, transfers) under the closed cycle.
3. Starts a fresh cycle with the closing balance as the new opening balance.

Closing is non-destructive — the prior cycle's entries are still readable, you just can't add to it.

## Auto-replenishment

Funds with a `fixed_amount` or `top_to_ceiling` replenishment policy (Pro) replenish on cadence — daily, weekly, monthly, yearly. The replenishment is recorded as a top-up entry against the active cycle.

- **Fixed amount** — adds a flat amount each cycle.
- **Top to ceiling** — adds enough to bring the balance up to the ceiling (skipping if the balance is already at or above ceiling).

`manual` policy means no auto-replenishment — you record top-ups by hand.

## Viewing cycle history

- Free vaults see only the **active** cycle.
- Pro vaults (`fund:cycle_history`) see the full archive — every closed cycle's open / close balances, totals, and entries.

## Related

- [Funds](/docs/funds) — the parent concept.
- [Reimbursements](/docs/reimbursements) — settle out-of-pocket charges into a cycle.
- [Plans & billing](/docs/plans-billing) — what changes between Free and Pro for funds.
