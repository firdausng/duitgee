---
title: Transfers
description: Move balance from one fund to another — recorded as a paired entry on each side, no double-counting.
---

<svelte:head>

<title>Transfers — DuitGee Docs</title>
<meta name="description" content="Move balance from one fund to another — recorded as a paired entry on each side, no double-counting." />

</svelte:head>

# Transfers

A transfer moves balance from one fund to another. Pro feature.

## When to use a transfer

- You over-funded the kid's allowance and want to move the excess back to the household card.
- The trip ended with a surplus and you're rolling it into next year's trip pool.
- You're rebalancing across wallets after a top-up landed in the wrong place.

Transfers are **internal** — they don't affect total household spend and don't show up as expenses. They're bookkeeping, not transactions.

## How it works

From the fund detail page, hit **Transfer**:

1. Pick the destination fund.
2. Enter the amount.
3. Optionally add a note.
4. Save.

DuitGee writes a paired entry: a debit on the source fund and a credit on the destination, both with the same transfer ID. Statistics handlers ignore transfer entries when computing spend, so transfers don't poison your category breakdowns.

## Plan tier

Pro only (`fund:transfer`). Free vaults can't transfer — top up and deduct each fund independently.

## Permissions

Owner or Admin only.

## Related

- [Funds](/docs/funds) — the parent concept.
- [Cycles](/docs/fund-cycles) — transfers land in the active cycle on each side.
- [Plans & billing](/docs/plans-billing) — why transfers are Pro.
